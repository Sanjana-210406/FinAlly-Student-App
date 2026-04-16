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
public class YearlyProgressResponse {
    private BigDecimal targetAmount;
    private BigDecimal savedSoFar;
    private Integer    targetYear;
    private Integer    monthsRemaining;
    private BigDecimal dynamicMonthlyTarget;
    private Double     percentComplete;
    private List<String> recoveryTips;
}