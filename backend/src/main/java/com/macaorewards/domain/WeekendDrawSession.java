package com.macaorewards.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "weekend_draw_sessions")
public class WeekendDrawSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** 活動內週序 1..N（依 occurredAt 與活動起日計算） */
    @Column(nullable = false)
    private Integer weekNumber;

    @Column(nullable = false)
    private Instant occurredAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private WalletProvider wallet;

    /** 可選，事後補帳；不做滿額校驗 */
    @Column(precision = 12, scale = 2)
    private BigDecimal spendAmount;

    /** 商戶（選填） */
    @Column(length = 500)
    private String merchantName;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("drawIndex ASC")
    private List<WeekendDrawOutcome> outcomes = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Integer getWeekNumber() {
        return weekNumber;
    }

    public void setWeekNumber(Integer weekNumber) {
        this.weekNumber = weekNumber;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(Instant occurredAt) {
        this.occurredAt = occurredAt;
    }

    public WalletProvider getWallet() {
        return wallet;
    }

    public void setWallet(WalletProvider wallet) {
        this.wallet = wallet;
    }

    public BigDecimal getSpendAmount() {
        return spendAmount;
    }

    public void setSpendAmount(BigDecimal spendAmount) {
        this.spendAmount = spendAmount;
    }

    public String getMerchantName() {
        return merchantName;
    }

    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
    }

    public List<WeekendDrawOutcome> getOutcomes() {
        return outcomes;
    }

    public void replaceOutcomes(List<WeekendDrawOutcome> newOutcomes) {
        outcomes.clear();
        for (WeekendDrawOutcome o : newOutcomes) {
            o.setSession(this);
            outcomes.add(o);
        }
    }
}
