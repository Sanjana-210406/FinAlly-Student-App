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
public class AlertService {

    private final AlertRepository alertRepo;

    @Transactional
    public Alert createAlert(User user, Alert.AlertType type, String message, ExpenseCategory category) {
        Alert alert = Alert.builder()
            .user(user)
            .alertType(type)
            .message(message)
            .category(category)
            .isRead(false)
            .build();
        return alertRepo.save(alert);
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> getAlerts(Long userId) {
        return alertRepo.findByUserIdOrderByCreatedAtDesc(userId)
            .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public void markRead(Long userId, Long alertId) {
        alertRepo.findById(alertId).ifPresent(a -> {
            if (a.getUser().getId().equals(userId)) {
                a.setIsRead(true);
                alertRepo.save(a);
            }
        });
    }

    public long countUnread(Long userId) {
        return alertRepo.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> getBotMessages(Long userId) {
        return alertRepo.findBotMessagesByUserId(userId)
            .stream().map(this::toDto).collect(Collectors.toList());
    }

    private AlertResponse toDto(Alert a) {
        return AlertResponse.builder()
            .id(a.getId())
            .message(a.getMessage())
            .alertType(a.getAlertType().name())
            .categoryName(a.getCategory() != null ? a.getCategory().getName() : null)
            .isRead(a.getIsRead())
            .createdAt(a.getCreatedAt())
            .build();
    }
}