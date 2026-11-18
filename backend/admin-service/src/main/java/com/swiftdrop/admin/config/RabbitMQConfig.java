
package com.swiftdrop.admin.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // =====================================
    // PARCEL ANALYTICS SETTINGS
    // =====================================

    @Value("${app.messaging.parcel-exchange}")
    private String exchangeName;

    @Value("${app.messaging.parcel-analytics-queue}")
    private String queueName;

    @Value("${app.messaging.parcel-created-routing-key}")
    private String createdRoutingKey;

    @Value("${app.messaging.parcel-status-routing-key}")
    private String statusRoutingKey;


    // =====================================
    // PRICING SETTINGS
    // =====================================

    @Value("${app.messaging.pricing-exchange}")
    private String pricingExchangeName;

    @Value("${app.messaging.pricing-queue}")
    private String pricingQueueName;

    @Value("${app.messaging.pricing-routing-key}")
    private String pricingRoutingKey;


    // =====================================
    // ZONE SETTINGS
    // =====================================

    @Value("${app.messaging.zone-exchange}")
    private String zoneExchangeName;

    @Value("${app.messaging.zone-queue}")
    private String zoneQueueName;

    @Value("${app.messaging.zone-routing-key}")
    private String zoneRoutingKey;


    // =====================================
    // PARCEL ANALYTICS EXCHANGE AND QUEUE
    // =====================================

    @Bean
    public TopicExchange parcelExchange() {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public Queue parcelAnalyticsQueue() {
        return new Queue(queueName, true);
    }

    @Bean
    public Binding parcelCreatedBinding(
            @Qualifier("parcelAnalyticsQueue") Queue queue,
            @Qualifier("parcelExchange") TopicExchange exchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(exchange)
                .with(createdRoutingKey);
    }

    @Bean
    public Binding parcelStatusBinding(
            @Qualifier("parcelAnalyticsQueue") Queue queue,
            @Qualifier("parcelExchange") TopicExchange exchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(exchange)
                .with(statusRoutingKey);
    }


    // =====================================
    // PRICING EXCHANGE AND QUEUE
    // =====================================

    @Bean
    public TopicExchange pricingExchange() {
        return new TopicExchange(pricingExchangeName, true, false);
    }

    @Bean
    public Queue pricingQueue() {
        return new Queue(pricingQueueName, true);
    }

    @Bean
    public Binding pricingBinding(
            @Qualifier("pricingQueue") Queue queue,
            @Qualifier("pricingExchange") TopicExchange exchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(exchange)
                .with(pricingRoutingKey);
    }


    // =====================================
    // ZONE EXCHANGE AND QUEUE
    // =====================================

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
            @Qualifier("zoneExchange") TopicExchange exchange
    ) {
        return BindingBuilder
                .bind(queue)
                .to(exchange)
                .with(zoneRoutingKey);
    }
}
