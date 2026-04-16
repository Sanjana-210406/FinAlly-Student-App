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

public interface FinancialHealthScoreRepository extends JpaRepository<FinancialHealthScore, Long> {
    Optional<FinancialHealthScore> findTopByUserIdOrderByCalculatedAtDesc(Long userId);
    List<FinancialHealthScore>     findTop6ByUserIdOrderByCalculatedAtDesc(Long userId);
}