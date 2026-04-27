package com.macaorewards.service;

import com.macaorewards.api.dto.OutcomeInput;
import com.macaorewards.api.dto.WeekendDrawSessionRequest;
import com.macaorewards.api.dto.WeekendDrawSessionResponse;
import com.macaorewards.domain.User;
import com.macaorewards.domain.WalletConsumptionRecord;
import com.macaorewards.domain.WeekendDrawOutcome;
import com.macaorewards.domain.WeekendDrawSession;
import com.macaorewards.domain.WalletProvider;
import com.macaorewards.repo.UserRepository;
import com.macaorewards.repo.WalletConsumptionRecordRepository;
import com.macaorewards.repo.WeekendDrawSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class WeekendDrawSessionService {

    private static final Set<Integer> ALLOWED_PRIZES = Set.of(10, 20, 50, 100, 200);
    private static final String AUTO_CONSUME_NOTE_PREFIX = "AUTO_CONSUME_DENOM=";
    private static final Pattern LEGACY_AUTO_CONSUME_PATTERN = Pattern.compile("^前端快速消耗\\s*(\\d+)\\s*券$");

    private final WeekendDrawSessionRepository sessions;
    private final WalletConsumptionRecordRepository consumptions;
    private final UserRepository users;
    private final CampaignWeekService weeks;

    public WeekendDrawSessionService(
            WeekendDrawSessionRepository sessions,
            WalletConsumptionRecordRepository consumptions,
            UserRepository users,
            CampaignWeekService weeks
    ) {
        this.sessions = sessions;
        this.consumptions = consumptions;
        this.users = users;
        this.weeks = weeks;
    }

    @Transactional(readOnly = true)
    public List<WeekendDrawSessionResponse> list(Long userId) {
        return sessions.findAllByUserIdWithOutcomes(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public WeekendDrawSessionResponse get(Long id, Long userId) {
        WeekendDrawSession s = sessions.findByIdAndUserIdWithOutcomes(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return toResponse(s);
    }

    @Transactional
    public WeekendDrawSessionResponse create(Long userId, WeekendDrawSessionRequest req) {
        User user = users.findById(userId).orElseThrow();
        validateOutcomes(req.outcomes());
        int weekNumber = weeks.weekNumberFor(req.occurredAt());
        validateUniqueWalletPerWeekOnCreate(userId, weekNumber, req.wallet());
        WeekendDrawSession s = new WeekendDrawSession();
        s.setUser(user);
        s.setOccurredAt(req.occurredAt());
        s.setWallet(req.wallet());
        s.setSpendAmount(req.spendAmount());
        s.setMerchantName(req.merchantName());
        s.setWeekNumber(weekNumber);
        s.replaceOutcomes(buildOutcomes(req.outcomes()));
        return toResponse(sessions.save(s));
    }

    @Transactional
    public WeekendDrawSessionResponse update(Long id, Long userId, WeekendDrawSessionRequest req) {
        WeekendDrawSession s = sessions.findByIdAndUserIdWithOutcomes(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        validateOutcomes(req.outcomes());
        int weekNumber = weeks.weekNumberFor(req.occurredAt());
        validateUniqueWalletPerWeekOnUpdate(userId, weekNumber, req.wallet(), id);
        s.setOccurredAt(req.occurredAt());
        s.setWallet(req.wallet());
        s.setSpendAmount(req.spendAmount());
        s.setMerchantName(req.merchantName());
        s.setWeekNumber(weekNumber);
        applyOutcomesInPlace(s, req.outcomes());
        return toResponse(sessions.save(s));
    }

    @Transactional
    public void delete(Long id, Long userId) {
        WeekendDrawSession s = sessions.findByIdAndUserIdWithOutcomes(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        rollbackAutoConsumptionForDeletedSession(s, userId);
        sessions.delete(s);
    }

    /**
     * 刪除中獎記錄時，同步回滾由「點券消耗」自動建立的消費紀錄，避免重建後仍被舊消耗覆蓋。
     */
    private void rollbackAutoConsumptionForDeletedSession(WeekendDrawSession session, Long userId) {
        Instant[] bounds = weeks.weekBoundsFor(session.getOccurredAt());
        List<WalletConsumptionRecord> walletConsumptions = consumptions
                .findByUserIdAndWalletAndOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(
                        userId,
                        session.getWallet(),
                        bounds[0],
                        bounds[1]
                );

        Map<Integer, Long> toRollbackByDenom = session.getOutcomes().stream()
                .map(WeekendDrawOutcome::getPrizeMop)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(p -> p, Collectors.counting()));

        if (toRollbackByDenom.isEmpty()) {
            return;
        }

        for (WalletConsumptionRecord record : walletConsumptions) {
            Integer explicitDenom = parseExplicitConsumedDenom(record.getNote());
            if (explicitDenom == null) {
                continue;
            }
            long remaining = toRollbackByDenom.getOrDefault(explicitDenom, 0L);
            if (remaining <= 0) {
                continue;
            }
            consumptions.delete(record);
            if (remaining == 1) {
                toRollbackByDenom.remove(explicitDenom);
            } else {
                toRollbackByDenom.put(explicitDenom, remaining - 1);
            }
            if (toRollbackByDenom.isEmpty()) {
                return;
            }
        }
    }

    private Integer parseExplicitConsumedDenom(String note) {
        if (note == null) {
            return null;
        }
        if (note.startsWith(AUTO_CONSUME_NOTE_PREFIX)) {
            try {
                return Integer.parseInt(note.substring(AUTO_CONSUME_NOTE_PREFIX.length()).trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        Matcher legacy = LEGACY_AUTO_CONSUME_PATTERN.matcher(note.trim());
        if (!legacy.matches()) return null;
        try {
            return Integer.parseInt(legacy.group(1));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void validateOutcomes(List<OutcomeInput> outcomes) {
        if (outcomes == null || outcomes.size() != 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "必須提供恰好 3 筆抽獎結果");
        }
        Set<Integer> indices = outcomes.stream().map(OutcomeInput::drawIndex).collect(Collectors.toSet());
        if (!indices.equals(Set.of(1, 2, 3))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "drawIndex 須為 1、2、3 各一筆");
        }
        for (OutcomeInput o : outcomes) {
            if (o.prizeMop() != null && !ALLOWED_PRIZES.contains(o.prizeMop())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "prizeMop 僅能為 10、20、50、100、200 或 null");
            }
        }
    }

    private void validateUniqueWalletPerWeekOnCreate(Long userId, int weekNumber, WalletProvider wallet) {
        if (sessions.existsByUserIdAndWeekNumberAndWallet(userId, weekNumber, wallet)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "同一週同一支付工具僅可建立一筆抽獎紀錄");
        }
    }

    private void validateUniqueWalletPerWeekOnUpdate(Long userId, int weekNumber, WalletProvider wallet, Long currentId) {
        if (sessions.existsByUserIdAndWeekNumberAndWalletAndIdNot(userId, weekNumber, wallet, currentId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "同一週同一支付工具僅可建立一筆抽獎紀錄");
        }
    }

    private List<WeekendDrawOutcome> buildOutcomes(List<OutcomeInput> outcomes) {
        List<WeekendDrawOutcome> list = new ArrayList<>();
        outcomes.stream()
                .sorted(Comparator.comparingInt(OutcomeInput::drawIndex))
                .forEach(o -> {
                    WeekendDrawOutcome x = new WeekendDrawOutcome();
                    x.setDrawIndex(o.drawIndex());
                    x.setPrizeMop(o.prizeMop());
                    list.add(x);
                });
        return list;
    }

    /**
     * 註解：更新時不要清空再插入，避免 Hibernate flush 順序導致 (session_id, draw_index) 唯一索引碰撞。
     * 改為同一 session 內就地更新 prizeMop；缺的才補，超出的才刪。
     */
    private void applyOutcomesInPlace(WeekendDrawSession session, List<OutcomeInput> inputs) {
        Map<Integer, WeekendDrawOutcome> existingByIndex = session.getOutcomes().stream()
                .collect(Collectors.toMap(WeekendDrawOutcome::getDrawIndex, o -> o, (a, b) -> a));

        Set<Integer> keep = new HashSet<>();
        for (OutcomeInput in : inputs) {
            int idx = in.drawIndex();
            keep.add(idx);
            WeekendDrawOutcome existing = existingByIndex.get(idx);
            if (existing != null) {
                existing.setPrizeMop(in.prizeMop());
            } else {
                WeekendDrawOutcome created = new WeekendDrawOutcome();
                created.setSession(session);
                created.setDrawIndex(idx);
                created.setPrizeMop(in.prizeMop());
                session.getOutcomes().add(created);
            }
        }

        session.getOutcomes().removeIf(o -> !keep.contains(o.getDrawIndex()));
    }

    private WeekendDrawSessionResponse toResponse(WeekendDrawSession s) {
        List<WeekendDrawSessionResponse.OutcomeRow> orows = s.getOutcomes().stream()
                .sorted(Comparator.comparingInt(WeekendDrawOutcome::getDrawIndex))
                .map(o -> new WeekendDrawSessionResponse.OutcomeRow(o.getId(), o.getDrawIndex(), o.getPrizeMop()))
                .toList();
        return new WeekendDrawSessionResponse(
                s.getId(),
                s.getWeekNumber(),
                s.getOccurredAt(),
                s.getWallet(),
                s.getSpendAmount(),
                s.getMerchantName(),
                orows
        );
    }
}
