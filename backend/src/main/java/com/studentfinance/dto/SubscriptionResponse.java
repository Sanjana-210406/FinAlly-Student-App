package com.studentfinance.dto;

import com.studentfinance.model.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SubscriptionResponse {
    private Long       id;
    private String     merchantName;
    private BigDecimal amount;
    private String     frequency;
    private LocalDate  lastChargedDate;
    private String     status;
    private Boolean    userConfirmed;
}