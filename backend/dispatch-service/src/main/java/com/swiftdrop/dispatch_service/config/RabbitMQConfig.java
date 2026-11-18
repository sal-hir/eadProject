package com.swiftdrop.dispatch_service.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String PARCEL_EXCHANGE = "swiftdrop.parcel.exchange";
    public static final String DISPATCH_PARCEL_QUEUE = "dispatch.parcel.created.queue";
    public static final String PARCEL_CREATED_ROUTING_KEY = "parcel.created";

    @Bean
    public TopicExchange parcelExchange() {
        return new TopicExchange(PARCEL_EXCHANGE, true, false);
    }

    @Bean
    public Queue dispatchParcelQueue() {
        return new Queue(DISPATCH_PARCEL_QUEUE, true);
    }

    @Bean
    public Binding dispatchParcelBinding(Queue dispatchParcelQueue, TopicExchange parcelExchange) {
        return BindingBuilder.bind(dispatchParcelQueue).to(parcelExchange).with(PARCEL_CREATED_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(jsonMessageConverter());
        return rabbitTemplate;
    }
}