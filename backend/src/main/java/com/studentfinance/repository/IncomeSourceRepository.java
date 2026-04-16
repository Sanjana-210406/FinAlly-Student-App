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

public interface IncomeSourceRepository extends JpaRepository<IncomeSource, Long> {
    List<IncomeSource> findByUserId(Long userId);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM IncomeSource i WHERE i.user.id = :uid AND i.frequency = 'MONTHLY'")
    BigDecimal sumMonthlyIncomeByUserId(@Param("uid") Long userId);
}