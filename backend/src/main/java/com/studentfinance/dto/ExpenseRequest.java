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
public class ExpenseRequest {
    @NotNull @Positive private BigDecimal amount;
    @NotBlank          private String description;
    @NotNull           private LocalDate date;
    private Long       categoryId;    // null = auto-classify
    private Boolean    confirmedAnomalous = false;
    private Boolean    emotionalSpend = false;
}