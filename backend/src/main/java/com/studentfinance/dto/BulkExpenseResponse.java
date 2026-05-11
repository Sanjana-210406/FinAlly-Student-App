package com.studentfinance.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkExpenseResponse {
    private List<ExpenseResponse> saved;
    private int duplicatesSkipped;
    private int totalSubmitted;
}
