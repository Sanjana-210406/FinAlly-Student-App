package com.studentfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * User entity — Student profile only.
 * Gender and age drive Behavioral Bot tone personalization.
 */
@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false)
    private String password; // BCrypt hashed

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_type", nullable = false)
    private ProfileType profileType = ProfileType.STUDENT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Gender gender = Gender.OTHER;

    @Column(nullable = false, columnDefinition = "TINYINT")
    private Integer age = 20;

    @Column(length = 200)
    private String college;

    @Column(name = "study_year", length = 10)
    private String studyYear;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum ProfileType { STUDENT }

    public enum Gender { MALE, FEMALE, OTHER }
}
