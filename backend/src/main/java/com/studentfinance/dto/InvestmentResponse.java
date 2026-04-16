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
public class InvestmentResponse {
    private Boolean          unlocked;
    private BigDecimal       surplus;
    private List<InvestSuggestion> suggestions;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InvestSuggestion {
        private String type;
        private String name;
        private String desc;
        private String returns;
        private String risk;
        private BigDecimal minAmount;
    }
}