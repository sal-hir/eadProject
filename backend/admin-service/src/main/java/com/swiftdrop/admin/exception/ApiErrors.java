package com.swiftdrop.admin.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

public class ApiErrors {

    public static void write(
            ObjectMapper mapper,
            HttpServletResponse response,
            int status,
            String message
    ) throws IOException {

        response.setStatus(status);
        response.setContentType("application/json");

        mapper.writeValue(
                response.getOutputStream(),
                Map.of(
                        "success", false,
                        "message", message
                )
        );
    }
}