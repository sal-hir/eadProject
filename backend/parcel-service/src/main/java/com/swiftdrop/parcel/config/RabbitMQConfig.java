package com.swiftdrop.parcel.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Default values දමා ඇත, එවිට .env හෝ properties නැතත් app එක crash වන්නේ නැත
    @Value("${app.messaging.zone-exchange:swiftdrop.zones}")
    private String zoneExchangeName;

    @Value("${app.messaging.zone-queue:parcel.zones.updates}")
    private String zoneQueueName;

    @Value("${app.messaging.zone-routing-key:zone.updated}")
    private String zoneRoutingKey;

    public static final String PARCEL_EXCHANGE = "swiftdrop.parcel.exchange";
    public static final String PARCEL_CREATED_ROUTING_KEY = "parcel.created";

    @Bean
    public TopicExchange zoneExchange() {
        return new TopicExchange(zoneExchangeName, true, false);
    }

    @Bean
    public Queue zoneQueue() {
        return new Queue(zoneQueueName, true);
    }

    @Bean
    public Binding zoneBinding(
            @Qualifier("zoneQueue") Queue queue,
            @Qualifier("zoneExchange") TopicExchange exchange) {
        return BindingBuilder
                .bind(queue)
                .to(exchange)
                .with(zoneRoutingKey);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}