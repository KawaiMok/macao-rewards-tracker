package com.macaorewards.repo;

import com.macaorewards.domain.WeeklyLotteryEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WeeklyLotteryEntryRepository extends JpaRepository<WeeklyLotteryEntry, Long> {

    List<WeeklyLotteryEntry> findByUserIdOrderByEntryDateDesc(Long userId);
}
