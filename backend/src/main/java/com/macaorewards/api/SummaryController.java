package com.macaorewards.api;

import com.macaorewards.api.dto.SummaryResponse;
import com.macaorewards.api.dto.WeeklyPrizeBoardResponse;
import com.macaorewards.security.SecurityUser;
import com.macaorewards.service.SummaryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/summary")
public class SummaryController {

    private final SummaryService summaryService;

    public SummaryController(SummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @GetMapping
    public SummaryResponse summary(@RequestParam(required = false) Integer campaignYear) {
        SecurityUser u = CurrentUser.require();
        return summaryService.summarize(u.getId(), campaignYear);
    }

    @GetMapping("/weekly-prize-board")
    public WeeklyPrizeBoardResponse weeklyPrizeBoard(@RequestParam(required = false) Integer campaignYear) {
        SecurityUser u = CurrentUser.require();
        return summaryService.weeklyPrizeBoard(u.getId(), campaignYear);
    }
}
