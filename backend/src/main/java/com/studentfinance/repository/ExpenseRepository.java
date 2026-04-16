package com.studentfinance.repository;

import com.studentfinance.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByUserIdOrderByDateDescCreatedAtDesc(Long userId);
    List<Expense> findByUserIdAndBudgetIdOrderByDateDesc(Long userId, Long budgetId);
    boolean existsByUserIdAndFingerprint(Long userId, String fingerprint);

    @Query("SELECT COALESCE(SUM(e.amount),0) FROM Expense e WHERE e.user.id=:uid AND e.budget.id=:bid AND e.category.id=:cid")
    BigDecimal sumByCategoryAndBudget(@Param("uid") Long userId, @Param("bid") Long budgetId, @Param("cid") Long categoryId);

    @Query("SELECT COALESCE(SUM(e.amount),0) FROM Expense e WHERE e.user.id=:uid AND e.budget.id=:bid")
    BigDecimal sumByBudget(@Param("uid") Long userId, @Param("bid") Long budgetId);

    @Query("SELECT COALESCE(AVG(e.amount),0) FROM Expense e WHERE e.user.id=:uid AND e.category.id=:cid AND e.date >= :since")
    BigDecimal avgByCategoryAndDateAfter(@Param("uid") Long userId, @Param("cid") Long categoryId, @Param("since") LocalDate since);

    @Query("SELECT e FROM Expense e WHERE e.user.id=:uid AND e.date >= :since ORDER BY e.createdAt DESC")
    List<Expense> findRecentByUserId(@Param("uid") Long userId, @Param("since") LocalDate since);

    @Query("SELECT e FROM Expense e WHERE e.user.id=:uid AND e.isEmotionalSpend=true ORDER BY e.date DESC")
    List<Expense> findEmotionalSpendsByUserId(@Param("uid") Long userId);

    @Query("SELECT COUNT(e) FROM Expense e WHERE e.user.id=:uid AND e.createdAt >= :since")
    long countRecentByUserId(@Param("uid") Long userId, @Param("since") java.time.LocalDateTime since);
}