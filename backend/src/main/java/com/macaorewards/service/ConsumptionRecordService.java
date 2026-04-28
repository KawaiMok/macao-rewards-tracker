package com.macaorewards.service;

import com.macaorewards.api.dto.ConsumptionRecordRequest;
import com.macaorewards.api.dto.ConsumptionRecordResponse;
import com.macaorewards.api.dto.UndoExplicitConsumeRequest;
import com.macaorewards.domain.User;
import com.macaorewards.domain.WalletConsumptionRecord;
import com.macaorewards.domain.WalletProvider;
import com.macaorewards.repo.UserRepository;
import com.macaorewards.repo.WalletConsumptionRecordRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class ConsumptionRecordService {

    private static final String AUTO_CONSUME_NOTE_PREFIX = "AUTO_CONSUME_DENOM=";

    private final WalletConsumptionRecordRepository repo;
    private final UserRepository users;
    private final CampaignWeekService weeks;

    public ConsumptionRecordService(
            WalletConsumptionRecordRepository repo,
            UserRepository users,
            CampaignWeekService weeks
    ) {
        this.repo = repo;
        this.users = users;
        this.weeks = weeks;
    }

    @Transactional
    public ConsumptionRecordResponse create(Long userId, ConsumptionRecordRequest req) {
        User user = users.findById(userId).orElseThrow();
        WalletConsumptionRecord r = new WalletConsumptionRecord();
        r.setUser(user);
        r.setWallet(req.wallet());
        r.setOccurredAt(req.occurredAt());
        r.setAmount(req.amount());
        r.setNote(req.note());
        return toResponse(repo.save(r));
    }

    @Transactional(readOnly = true)
    public List<ConsumptionRecordResponse> listCurrentWeek(Long userId, WalletProvider wallet) {
        Instant[] bounds = weeks.currentCampaignWeekBounds();
        return repo.findByUserIdAndWalletAndOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(
                        userId, wallet, bounds[0], bounds[1]
                ).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void undoExplicitConsume(Long userId, UndoExplicitConsumeRequest req) {
        Instant[] bounds = weeks.currentCampaignWeekBounds();
        String note = AUTO_CONSUME_NOTE_PREFIX + req.denom();
        // 撤銷「點哪張就消耗哪張」：刪除本週最新一筆對應 note 的消費紀錄
        WalletConsumptionRecord r = repo.findFirstByUserIdAndWalletAndOccurredAtGreaterThanEqualAndOccurredAtLessThanAndNoteOrderByOccurredAtDesc(
                userId, req.wallet(), bounds[0], bounds[1], note
        ).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到可撤銷的消耗紀錄"));
        repo.delete(r);
    }

    private ConsumptionRecordResponse toResponse(WalletConsumptionRecord r) {
        return new ConsumptionRecordResponse(
                r.getId(),
                r.getWallet(),
                r.getOccurredAt(),
                r.getAmount(),
                r.getNote()
        );
    }
}
