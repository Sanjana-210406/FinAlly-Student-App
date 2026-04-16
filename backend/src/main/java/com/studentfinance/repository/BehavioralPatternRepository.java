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

public interface BehavioralPatternRepository extends JpaRepository<BehavioralPattern, Long> {
    List<BehavioralPattern> findByUserIdAndIsActiveTrueOrderByDetectedAtDesc(Long userId);
}