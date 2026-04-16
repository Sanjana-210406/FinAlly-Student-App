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
public class BudgetResponse {
    private Long       id;
    private Integer    month;
    private Integer    year;
    private BigDecimal totalIncome;
    private BigDecimal savingsTarget;
    private BigDecimal needsAllocation;
    private BigDecimal wantsAllocation;
    private BigDecimal emergencyBuffer;
    private BigDecimal dynamicMonthlyTarget;
    private BigDecimal totalSpent;
    private BigDecimal actualSaved;
    private BigDecimal emergencyFundBalance;
    private BigDecimal emergencyFundTarget;
    private Map<String, BigDecimal> categoryAllocations;
}