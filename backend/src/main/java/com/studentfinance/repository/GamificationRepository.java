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

public interface GamificationRepository extends JpaRepository<Gamification, Long> {
    List<Gamification> findByUserId(Long userId);
    Optional<Gamification> findByUserIdAndStreakType(Long userId, Gamification.StreakType type);
    List<Gamification> findByUserIdAndBadgeCodeIsNotNull(Long userId);
    boolean existsByUserIdAndBadgeCode(Long userId, String badgeCode);
}