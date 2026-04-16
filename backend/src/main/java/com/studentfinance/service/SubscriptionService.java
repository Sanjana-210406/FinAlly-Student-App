package com.studentfinance.service;

import com.studentfinance.dto.*;
import com.studentfinance.model.*;
import com.studentfinance.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subRepo;
    private final AlertService           alertService;

    @Transactional
    public void detectAndUpsert(User user, String merchantName, BigDecimal amount, LocalDate date) {
        String normalized = merchantName.toLowerCase().trim();
        subRepo.findByUserIdAndMerchantName(user.getId(), normalized).ifPresentOrElse(
            sub -> {
                sub.setLastChargedDate(date);
                sub.setStatus(Subscription.SubscriptionStatus.ACTIVE);
                subRepo.save(sub);
            },
            () -> subRepo.save(Subscription.builder()
                .user(user).merchantName(normalized).amount(amount)
                .frequency(Subscription.Frequency.MONTHLY)
                .lastChargedDate(date)
                .status(Subscription.SubscriptionStatus.ACTIVE)
                .build())
        );
        // Check for possibly cancelled (not charged in 45+ days)
        subRepo.findByUserIdOrderByStatusAscMerchantNameAsc(user.getId()).forEach(sub -> {
            if (sub.getStatus() == Subscription.SubscriptionStatus.ACTIVE) {
                long daysSince = java.time.temporal.ChronoUnit.DAYS.between(sub.getLastChargedDate(), LocalDate.now());
                if (daysSince > 45) {
                    sub.setStatus(Subscription.SubscriptionStatus.POSSIBLY_CANCELLED);
                    subRepo.save(sub);
                    alertService.createAlert(user, Alert.AlertType.SUBSCRIPTION_LEAK,
                        "'" + sub.getMerchantName() + "' hasn't been charged in " + daysSince + " days — still active?", null);
                }
            }
        });
    }

    public List<SubscriptionResponse> getSubscriptions(Long userId) {
        return subRepo.findByUserIdOrderByStatusAscMerchantNameAsc(userId)
            .stream().map(s -> SubscriptionResponse.builder()
                .id(s.getId()).merchantName(s.getMerchantName()).amount(s.getAmount())
                .frequency(s.getFrequency().name()).lastChargedDate(s.getLastChargedDate())
                .status(s.getStatus().name()).userConfirmed(s.getUserConfirmed())
                .build()).collect(Collectors.toList());
    }

    @Transactional
    public void updateStatus(Long userId, Long subId, String statusStr) {
        Subscription sub = subRepo.findById(subId).orElseThrow();
        if (!sub.getUser().getId().equals(userId)) throw new RuntimeException("Access denied.");
        sub.setStatus(Subscription.SubscriptionStatus.valueOf(statusStr));
        sub.setUserConfirmed(true);
        subRepo.save(sub);
    }
}