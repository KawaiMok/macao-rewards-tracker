package com.macaorewards.repo;

import com.macaorewards.domain.WeekendDrawSession;
import com.macaorewards.domain.WalletProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface WeekendDrawSessionRepository extends JpaRepository<WeekendDrawSession, Long> {

    @Query("""
            select s from WeekendDrawSession s
            left join fetch s.outcomes
            where s.user.id = :userId
            order by s.occurredAt desc
            """)
    List<WeekendDrawSession> findAllByUserIdWithOutcomes(@Param("userId") Long userId);

    @Query("""
            select s from WeekendDrawSession s
            left join fetch s.outcomes
            where s.id = :id and s.user.id = :userId
            """)
    Optional<WeekendDrawSession> findByIdAndUserIdWithOutcomes(@Param("id") Long id, @Param("userId") Long userId);

    List<WeekendDrawSession> findByUserIdAndOccurredAtGreaterThanEqual(Long userId, Instant from);

    boolean existsByUserIdAndWeekNumberAndWallet(Long userId, Integer weekNumber, WalletProvider wallet);

    boolean existsByUserIdAndWeekNumberAndWalletAndIdNot(Long userId, Integer weekNumber, WalletProvider wallet, Long id);
}
