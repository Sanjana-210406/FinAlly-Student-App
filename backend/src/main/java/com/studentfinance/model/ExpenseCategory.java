package com.studentfinance.model;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "expense_categories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExpenseCategory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CategoryType type;

    @Column(name = "icon_code", length = 50)
    private String iconCode;

    public enum CategoryType { NEED, WANT, INVESTMENT }
}
