
package com.swiftdrop.admin.client;

import java.util.UUID;

public interface IdentityGateway {

    record Caller(UUID id, String role) {
    }

    Caller validate(String token);
}
