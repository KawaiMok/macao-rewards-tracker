package com.macaorewards.service;

import com.macaorewards.api.dto.WeeklyLotteryEntryRequest;
import com.macaorewards.api.dto.WeeklyLotteryEntryResponse;
import com.macaorewards.domain.User;
import com.macaorewards.domain.WeeklyLotteryEntry;
import com.macaorewards.repo.UserRepository;
import com.macaorewards.repo.WeeklyLotteryEntryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class WeeklyLotteryEntryService {

    private final WeeklyLotteryEntryRepository repo;
    private final UserRepository users;

    public WeeklyLotteryEntryService(WeeklyLotteryEntryRepository repo, UserRepository users) {
        this.repo = repo;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<WeeklyLotteryEntryResponse> list(Long userId) {
        return repo.findByUserIdOrderByEntryDateDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public WeeklyLotteryEntryResponse get(Long id, Long userId) {
        WeeklyLotteryEntry e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!e.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return toResponse(e);
    }

    @Transactional
    public WeeklyLotteryEntryResponse create(Long userId, WeeklyLotteryEntryRequest req) {
        User user = users.findById(userId).orElseThrow();
        WeeklyLotteryEntry e = new WeeklyLotteryEntry();
        e.setUser(user);
        apply(e, req);
        return toResponse(repo.save(e));
    }

    @Transactional
    public WeeklyLotteryEntryResponse update(Long id, Long userId, WeeklyLotteryEntryRequest req) {
        WeeklyLotteryEntry e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!e.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        apply(e, req);
        return toResponse(repo.save(e));
    }

    @Transactional
    public void delete(Long id, Long userId) {
        WeeklyLotteryEntry e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!e.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        repo.delete(e);
    }

    private void apply(WeeklyLotteryEntry e, WeeklyLotteryEntryRequest req) {
        e.setEntryDate(req.entryDate());
        e.setSpendAmount(req.spendAmount());
        e.setMerchantName(req.merchantName());
        e.setNote(req.note());
    }

    private WeeklyLotteryEntryResponse toResponse(WeeklyLotteryEntry e) {
        return new WeeklyLotteryEntryResponse(
                e.getId(),
                e.getEntryDate(),
                e.getSpendAmount(),
                e.getMerchantName(),
                e.getNote()
        );
    }
}
