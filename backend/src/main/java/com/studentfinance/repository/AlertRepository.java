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

public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Alert> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndIsReadFalse(Long userId);

    @Query("SELECT a FROM Alert a WHERE a.user.id=:uid AND a.alertType='BEHAVIORAL_BOT' ORDER BY a.createdAt DESC")
    List<Alert> findBotMessagesByUserId(@Param("uid") Long userId);
}