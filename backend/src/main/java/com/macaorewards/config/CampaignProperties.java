package com.macaorewards.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.LocalDate;

@ConfigurationProperties(prefix = "app.campaign")
public class CampaignProperties {

    private int year = 2026;
    /** 活動第一天（含） */
    private LocalDate startDate = LocalDate.of(2026, 4, 10);
    private int weeksTotal = 10;

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public int getWeeksTotal() {
        return weeksTotal;
    }

    public void setWeeksTotal(int weeksTotal) {
        this.weeksTotal = weeksTotal;
    }
}
