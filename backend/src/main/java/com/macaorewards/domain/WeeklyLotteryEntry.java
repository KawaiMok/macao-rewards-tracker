package com.macaorewards.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 第二階段：週一至四每週抽獎參與記帳（試行版可先不暴露 UI，實體預留）。
 */
@Entity
@Table(name = "weekly_lottery_entries")
public class WeeklyLotteryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate entryDate;

    @Column(precision = 12, scale = 2)
    private BigDecimal spendAmount;

    @Column(length = 500)
    private String merchantName;

    @Column(length = 2000)
    private String note;

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDate getEntryDate() {
        return entryDate;
    }

    public void setEntryDate(LocalDate entryDate) {
        this.entryDate = entryDate;
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

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
