package com.macaorewards.service;

import com.macaorewards.config.CampaignProperties;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class CampaignWeekService {

    private static final ZoneId MACAU = ZoneId.of("Asia/Macau");

    private final CampaignProperties campaign;

    public CampaignWeekService(CampaignProperties campaign) {
        this.campaign = campaign;
    }

    /** 依發生時間計算活動週序 1..weeksTotal */
    public int weekNumberFor(Instant occurredAt) {
        LocalDate eventDay = LocalDate.ofInstant(occurredAt, MACAU);
        LocalDate start = campaign.getStartDate();
        long days = ChronoUnit.DAYS.between(start, eventDay);
        if (days < 0) {
            return 1;
        }
        int week = (int) (days / 7) + 1;
        return Math.min(Math.max(1, week), campaign.getWeeksTotal());
    }

    public LocalDate startOfWeekContaining(Instant occurredAt) {
        LocalDate eventDay = LocalDate.ofInstant(occurredAt, MACAU);
        LocalDate start = campaign.getStartDate();
        long days = ChronoUnit.DAYS.between(start, eventDay);
        if (days < 0) {
            return start;
        }
        int weekIndex = (int) (days / 7);
        return start.plusWeeks(weekIndex);
    }

    public LocalDate currentCampaignWeekStart() {
        return startOfWeekContaining(Instant.now());
    }

    public CampaignProperties getCampaign() {
        return campaign;
    }

    /** 含起、不含訖： [from, to) */
    public Instant[] weekBoundsFor(Instant occurredAt) {
        LocalDate weekStart = startOfWeekContaining(occurredAt);
        ZonedDateTime fromZ = weekStart.atStartOfDay(MACAU);
        ZonedDateTime toZ = weekStart.plusWeeks(1).atStartOfDay(MACAU);
        return new Instant[]{fromZ.toInstant(), toZ.toInstant()};
    }

    public Instant[] currentCampaignWeekBounds() {
        return weekBoundsFor(Instant.now());
    }
}
