package com.macaorewards.repo;

import com.macaorewards.domain.WalletConsumptionRecord;
import com.macaorewards.domain.WalletProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface WalletConsumptionRecordRepository extends JpaRepository<WalletConsumptionRecord, Long> {

    List<WalletConsumptionRecord> findByUserIdAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
            Long userId, Instant fromInclusive, Instant toExclusive
    );

    List<WalletConsumptionRecord> findByUserIdAndWalletAndOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(
            Long userId, WalletProvider wallet, Instant fromInclusive, Instant toExclusive
    );
}
