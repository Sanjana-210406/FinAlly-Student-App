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
public class SimulatorResponse {
    private String title;
    private List<SimStat>   stats;
    private List<String>    insights;

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SimStat {
        private String label;
        private String value;
        private String color;
    }
}