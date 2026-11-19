package com.swiftdrop.dispatch_service.client;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertNotNull;

public class CourierClientTest {

    @Test
    public void testGetAvailableCouriers() {
        CourierClient client = new CourierClient("http://localhost:4003");
        List<CourierClient.CourierDto> couriers = client.getAvailableCouriers("Bearer test-token");
        assertNotNull(couriers);
        System.out.println("=========================================");
        System.out.println("FETCHED COURIERS COUNT: " + couriers.size());
        System.out.println("COURIERS DATA: " + couriers);
        System.out.println("=========================================");
    }
}
