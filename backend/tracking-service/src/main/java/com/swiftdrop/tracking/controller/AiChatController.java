package com.swiftdrop.tracking.controller;

import com.swiftdrop.tracking.dto.AiChatRequest;
import com.swiftdrop.tracking.dto.AiChatResponse;
import com.swiftdrop.tracking.service.AiAssistantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "AI Delivery Assistant", description = "GenAI delivery assistant powered by LLM tool calling (MCP) for natural language parcel tracking and delivery fee estimation")
public class AiChatController {

    private final AiAssistantService aiAssistantService;

    public AiChatController(AiAssistantService aiAssistantService) {
        this.aiAssistantService = aiAssistantService;
    }

    /**
     * GenAI Delivery Assistant endpoint with MCP tool calling.
     * Answers queries like "Where is my parcel?" or "How much to send 2 kg to Kandy?"
     */
    @PostMapping("/chat")
    @Operation(summary = "Chat with AI delivery assistant", description = "Submits a natural language query to the GenAI assistant with MCP tool calling for real-time parcel queries and dynamic shipping estimates.")
    @ApiResponse(responseCode = "400", description = "Invalid chat request body")
    public ResponseEntity<AiChatResponse> chat(@Valid @RequestBody AiChatRequest request) {
        AiChatResponse response = aiAssistantService.processChat(request);
        return ResponseEntity.ok(response);
    }
}
