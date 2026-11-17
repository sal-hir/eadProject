package com.swiftdrop.admin.repository;

import com.swiftdrop.admin.entity.Zone;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ZoneRepository
        extends JpaRepository<Zone, UUID> {

    boolean existsByZoneNameIgnoreCase(String zoneName);

}