package com.swiftdrop.courier.controller;

import com.swiftdrop.courier.dto.UploadResponse;
import com.swiftdrop.courier.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Proof of Delivery", description = "Multipart file upload endpoints for courier proof-of-delivery photos")
@SecurityRequirement(name = "bearerAuth")
public class UploadController {
    private final FileStorageService storageService;

    public UploadController(FileStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping(value = {"/uploads/proof", "/couriers/proof"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload proof of delivery photo", description = "Accepts multipart JPEG/PNG image and returns the public asset URL for delivery verification.")
    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Invalid or empty image file"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    })
    public ResponseEntity<Map<String, Object>> uploadProof(@RequestParam("image") MultipartFile image) {
        UploadResponse resp = storageService.store(image);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "data", resp
        ));
    }
}
