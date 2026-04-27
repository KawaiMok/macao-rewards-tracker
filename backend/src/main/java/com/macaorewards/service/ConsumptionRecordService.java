package com.macaorewards.service;

import com.macaorewards.api.dto.ConsumptionRecordRequest;
import com.macaorewards.api.dto.ConsumptionRecordResponse;
import com.macaorewards.domain.User;
import com.macaorewards.domain.WalletConsumptionRecord;
import com.macaorewards.domain.WalletProvider;
import com.macaorewards.repo.UserRepository;
import com.macaorewards.repo.WalletConsumptionRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class ConsumptionRecordService {

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
