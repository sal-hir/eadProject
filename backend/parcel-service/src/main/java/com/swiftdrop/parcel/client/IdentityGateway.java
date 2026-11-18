package com.swiftdrop.parcel.client;

import java.util.UUID;

public interface IdentityGateway {

    record Caller(UUID id, String role) {}

    Caller validate(String bearerToken);
}