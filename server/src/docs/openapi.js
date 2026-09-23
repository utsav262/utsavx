/** OpenAPI 3.0 document for UTSAVX API */
export const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'UTSAVX API',
        version: '1.0.0',
        description:
            'Event ticketing API for India — auth, events, orders, Razorpay payments, manager tools, and staff invitations.\n\n' +
            '**Auth:** click **Authorize** and paste `Bearer <JWT>` from `/api/v1/auth/login`.\n\n' +
            '**Demo users:** `emma@utsavx.com` (customer), `leo@utsavx.com` (organizer), `admin@utsavx.com` (admin) — password `password123`.'
    },
    servers: [
        { url: 'http://localhost:5050/api/v1', description: 'Local' },
        { url: '/api/v1', description: 'Relative' }
    ],
    tags: [
        { name: 'Health' },
        { name: 'Auth' },
        { name: 'Events' },
        { name: 'Orders' },
        { name: 'Payments' },
        { name: 'Invitations' },
        { name: 'Manager' },
        { name: 'Admin' }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    code: { type: 'integer' }
                }
            },
            Success: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    code: { type: 'integer', example: 200 },
                    result: {}
                }
            },
            LoginRequest: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'emma@utsavx.com' },
                    password: { type: 'string', example: 'password123' }
                }
            },
            RegisterRequest: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    role: { type: 'string', enum: ['customer', 'organizer'] }
                }
            },
            AuthResponse: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                    result: { $ref: '#/components/schemas/User' },
                    code: { type: 'integer' }
                }
            },
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string', enum: ['customer', 'organizer', 'admin'] },
                    staffRole: { type: 'string', nullable: true },
                    staffRoleLabel: { type: 'string', nullable: true },
                    pendingInviteCount: { type: 'integer' },
                    staffEvents: { type: 'array', items: { type: 'object' } }
                }
            },
            CreateOrderRequest: {
                type: 'object',
                required: ['eventId', 'items', 'idempotencyKey'],
                properties: {
                    eventId: { type: 'string' },
                    idempotencyKey: { type: 'string' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['ticketTypeId', 'quantity'],
                            properties: {
                                ticketTypeId: { type: 'string' },
                                quantity: { type: 'integer', minimum: 1 }
                            }
                        }
                    }
                }
            },
            RazorpayVerifyRequest: {
                type: 'object',
                required: ['bookingOrderId', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'],
                properties: {
                    bookingOrderId: { type: 'string' },
                    razorpay_order_id: { type: 'string' },
                    razorpay_payment_id: { type: 'string' },
                    razorpay_signature: { type: 'string' }
                }
            },
            TicketCreateRequest: {
                type: 'object',
                required: ['eventId', 'name', 'quantity'],
                properties: {
                    eventId: { type: 'string' },
                    event_id: { type: 'string' },
                    name: { type: 'string', example: 'General Admission' },
                    description: { type: 'string' },
                    ticket_type: { type: 'string', enum: ['paid', 'free'] },
                    price: { type: 'number', example: 499 },
                    door_price: { type: 'number', example: 599 },
                    quantity: { type: 'integer', description: '0 = unlimited', example: 100 },
                    currency: { type: 'string', example: 'INR' },
                    type: { type: 'string', example: 'gate' },
                    sale_start: { type: 'string', format: 'date-time' },
                    sale_end: { type: 'string', format: 'date-time' },
                    pass_service_fee_to_buyer: { type: 'boolean' },
                    pass_payment_fee_to_buyer: { type: 'boolean' }
                }
            },
            HandlerAddRequest: {
                type: 'object',
                required: ['eventId', 'email', 'type'],
                properties: {
                    eventId: { type: 'string' },
                    event_id: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    type: {
                        type: 'string',
                        enum: ['Manager', 'Ambassador', 'Outlet', 'Event_Scanner']
                    },
                    scanner_permission: {
                        type: 'string',
                        enum: ['scan_only', 'sell_only', 'both']
                    },
                    commission_percentage: { type: 'number' },
                    verified: { type: 'boolean' },
                    tickets: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                event_ticket_id: { type: 'string' },
                                quantity: { type: 'integer' }
                            }
                        }
                    }
                }
            },
            EventCreateUpdate: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Omit to create' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    startsAt: { type: 'string', format: 'date-time' },
                    endsAt: { type: 'string', format: 'date-time' },
                    venue: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            address: { type: 'string' },
                            city: { type: 'string' },
                            country: { type: 'string' }
                        }
                    },
                    imageUrl: { type: 'string' },
                    status: {
                        type: 'string',
                        enum: ['draft', 'published', 'review_pending', 'sold-out', 'cancelled']
                    },
                    featured: { type: 'boolean' },
                    ticketTypes: { type: 'array', items: { type: 'object' } }
                }
            },
            SellRequest: {
                type: 'object',
                properties: {
                    event_id: { type: 'string' },
                    country: { type: 'string', example: 'IN' },
                    mode: { type: 'string', enum: ['digital', 'gate', 'complimentary'] },
                    tickets: { type: 'array', items: { type: 'object' } }
                }
            }
        }
    },
    paths: {
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Health check',
                servers: [{ url: 'http://localhost:5050' }],
                responses: {
                    200: {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ok: { type: 'boolean' },
                                        service: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Register customer or organizer',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } }
                },
                responses: {
                    201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
                    409: { description: 'Email exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                }
            }
        },
        '/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Login',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
                },
                responses: {
                    200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
                    401: { description: 'Invalid credentials' }
                }
            }
        },
        '/auth/me': {
            get: {
                tags: ['Auth'],
                summary: 'Current user profile',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } }
                }
            }
        },
        '/auth/become-organizer': {
            post: {
                tags: ['Auth'],
                summary: 'Upgrade customer to organizer',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'Upgraded' } }
            }
        },
        '/auth/logout': {
            post: {
                tags: ['Auth'],
                summary: 'Logout (client should discard token)',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/getCountryList': {
            get: {
                tags: ['Events'],
                summary: 'List countries',
                responses: { 200: { description: 'OK' } }
            }
        },
        '/getCities/{country}': {
            get: {
                tags: ['Events'],
                summary: 'List cities for a country',
                parameters: [{ name: 'country', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/getCategories': {
            get: {
                tags: ['Events'],
                summary: 'List event categories',
                responses: { 200: { description: 'OK' } }
            }
        },
        '/event/list': {
            get: {
                tags: ['Events'],
                summary: 'Public event list',
                parameters: [
                    { name: 'country', in: 'query', schema: { type: 'string' } },
                    { name: 'city', in: 'query', schema: { type: 'string' } },
                    { name: 'category', in: 'query', schema: { type: 'string' } },
                    { name: 'search', in: 'query', schema: { type: 'string' } },
                    { name: 'featured', in: 'query', schema: { type: 'boolean' } }
                ],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/event/list-by-type': {
            get: {
                tags: ['Events'],
                summary: 'Dashboard catalog by type (live / past / draft)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'event_type',
                        in: 'query',
                        schema: { type: 'string', enum: ['live', 'past', 'draft'] }
                    },
                    { name: 'page', in: 'query', schema: { type: 'integer' } },
                    { name: 'length', in: 'query', schema: { type: 'integer' } }
                ],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/event/details/{slug}': {
            get: {
                tags: ['Events'],
                summary: 'Event details by slug or id',
                parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } }
            }
        },
        '/event/{id}/related': {
            get: {
                tags: ['Events'],
                summary: 'Related events',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/orders': {
            get: {
                tags: ['Orders'],
                summary: 'My orders',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'OK' } }
            },
            post: {
                tags: ['Orders'],
                summary: 'Create order (reserves inventory)',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrderRequest' } } }
                },
                responses: {
                    201: {
                        description: 'Created',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        order: { type: 'object' },
                                        paymentRequired: { type: 'boolean' },
                                        provider: { type: 'string', nullable: true },
                                        demoPayment: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/orders/tickets': {
            get: {
                tags: ['Orders'],
                summary: 'My tickets',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/orders/lookup/{confirmationId}': {
            get: {
                tags: ['Orders'],
                summary: 'Public ticket lookup (no PII)',
                parameters: [
                    { name: 'confirmationId', in: 'path', required: true, schema: { type: 'string' } }
                ],
                responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } }
            }
        },
        '/payments/{orderId}/intent': {
            post: {
                tags: ['Payments'],
                summary: 'Create Razorpay order (or Stripe intent)',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    200: {
                        description: 'Payment session',
                        content: {
                            'application/json': {
                                schema: {
                                    allOf: [
                                        { $ref: '#/components/schemas/Success' },
                                        {
                                            type: 'object',
                                            properties: {
                                                result: {
                                                    type: 'object',
                                                    properties: {
                                                        provider: { type: 'string', example: 'razorpay' },
                                                        keyId: { type: 'string' },
                                                        razorpayOrderId: { type: 'string' },
                                                        amount: { type: 'integer' },
                                                        currency: { type: 'string' },
                                                        bookingOrderId: { type: 'string' },
                                                        testMode: { type: 'boolean' }
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        },
        '/payments/razorpay/verify': {
            post: {
                tags: ['Payments'],
                summary: 'Verify Razorpay signature and issue tickets',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/RazorpayVerifyRequest' } }
                    }
                },
                responses: { 200: { description: 'Paid + tickets issued' }, 400: { description: 'Invalid signature' } }
            }
        },
        '/payments/{orderId}/complete-demo': {
            post: {
                tags: ['Payments'],
                summary: 'Complete demo checkout (no gateway)',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' }, 403: { description: 'Demo disabled' } }
            }
        },
        '/invitations': {
            get: {
                tags: ['Invitations'],
                summary: 'List my team invitations',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'status',
                        in: 'query',
                        schema: { type: 'string', enum: ['P', 'A', 'D'] },
                        description: 'P=pending, A=accepted, D=declined'
                    }
                ],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/invitations/catalog': {
            get: {
                tags: ['Invitations'],
                summary: 'Staff event catalog',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/invitations/events/{eventId}': {
            get: {
                tags: ['Invitations'],
                summary: 'Staff event dashboard',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/invitations/events/{eventId}/tickets': {
            get: {
                tags: ['Invitations'],
                summary: 'Sellable tickets for staff',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/invitations/{id}/accept': {
            post: {
                tags: ['Invitations'],
                summary: 'Accept invitation',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Accepted' } }
            }
        },
        '/invitations/{id}/reject': {
            post: {
                tags: ['Invitations'],
                summary: 'Reject invitation',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Rejected' } }
            }
        },
        '/invitations/scan': {
            post: {
                tags: ['Invitations'],
                summary: 'Staff scan / validate ticket',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    event_id: { type: 'string' },
                                    code: { type: 'string' },
                                    action: { type: 'string', enum: ['validate', 'claim'] }
                                }
                            }
                        }
                    }
                },
                responses: { 200: { description: 'Scan result' } }
            }
        },
        '/invitations/sell': {
            post: {
                tags: ['Invitations'],
                summary: 'Staff cash / gate / complimentary sell',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/SellRequest' } } }
                },
                responses: { 200: { description: 'Sold' } }
            }
        },
        '/manager/dashboard/home': {
            get: {
                tags: ['Manager'],
                summary: 'Manager dashboard home',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'range',
                        in: 'query',
                        schema: { type: 'string', enum: ['week', 'month', 'year'] }
                    }
                ],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/events': {
            get: {
                tags: ['Manager'],
                summary: 'List my events',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/events/{id}': {
            get: {
                tags: ['Manager'],
                summary: 'Get event',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/events/create-or-update': {
            post: {
                tags: ['Manager'],
                summary: 'Create or update event',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/EventCreateUpdate' } } }
                },
                responses: { 200: { description: 'Updated' }, 201: { description: 'Created' } }
            }
        },
        '/manager/events/delete/{id}': {
            get: {
                tags: ['Manager'],
                summary: 'Cancel event',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Cancelled' } }
            }
        },
        '/manager/event-tickets/get-by-event/{id}/{type}': {
            get: {
                tags: ['Manager'],
                summary: 'List tickets for event',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                    {
                        name: 'type',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', example: 'all' },
                        description: 'all | paid | free | gate'
                    }
                ],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/event-tickets/create': {
            post: {
                tags: ['Manager'],
                summary: 'Create ticket tier',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketCreateRequest' } } }
                },
                responses: { 200: { description: 'Created' } }
            }
        },
        '/manager/event-tickets/update/{id}': {
            post: {
                tags: ['Manager'],
                summary: 'Update ticket tier',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketCreateRequest' } } }
                },
                responses: { 200: { description: 'Updated' } }
            }
        },
        '/manager/event-tickets/delete/{id}': {
            get: {
                tags: ['Manager'],
                summary: 'Delete ticket tier',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Deleted' } }
            }
        },
        '/manager/event-handlers/get-by-event/{id}/{type}': {
            get: {
                tags: ['Manager'],
                summary: 'List event handlers by type',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                    {
                        name: 'type',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                            example: 'all',
                            description: 'all | Manager | Ambassador | Outlet | Event_Scanner'
                        }
                    }
                ],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/event-handlers/add': {
            post: {
                tags: ['Manager'],
                summary: 'Invite team member',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/HandlerAddRequest' } } }
                },
                responses: { 201: { description: 'Invited' }, 409: { description: 'Duplicate invite' } }
            }
        },
        '/manager/event-handlers/delete/{id}': {
            get: {
                tags: ['Manager'],
                summary: 'Remove handler',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Removed' } }
            }
        },
        '/manager/ticket-orders/get-by-event/{id}': {
            get: {
                tags: ['Manager'],
                summary: 'Orders / sales table',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                    {
                        name: 'type',
                        in: 'query',
                        schema: { type: 'string', enum: ['summary', 'purchase_history', 'transactions'] }
                    }
                ],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/ticket-orders/sales-overview/{id}': {
            get: {
                tags: ['Manager'],
                summary: 'Sales overview',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/ticket-orders/check-ins/{id}': {
            get: {
                tags: ['Manager'],
                summary: 'Check-in stats',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/ticket-orders/payouts/{id}': {
            get: {
                tags: ['Manager'],
                summary: 'Payout info',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/ticket-orders/sell': {
            post: {
                tags: ['Manager'],
                summary: 'Owner sell (cash / gate / complimentary)',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/SellRequest' } } }
                },
                responses: { 200: { description: 'Sold' } }
            }
        },
        '/manager/ticket-orders/scan': {
            post: {
                tags: ['Manager'],
                summary: 'Owner scan ticket',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    event_id: { type: 'string' },
                                    code: { type: 'string' },
                                    action: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: { 200: { description: 'Scan result' } }
            }
        },
        '/manager/coupons/by-event/{eventId}': {
            get: {
                tags: ['Manager'],
                summary: 'List coupons',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'eventId', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/coupons/create': {
            post: {
                tags: ['Manager'],
                summary: 'Create coupon',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    event_id: { type: 'string' },
                                    code: { type: 'string' },
                                    discount_type: { type: 'string', enum: ['percentage', 'fixed'] },
                                    discount_value: { type: 'number' }
                                }
                            }
                        }
                    }
                },
                responses: { 201: { description: 'Created' } }
            }
        },
        '/manager/event-guests/get-by-event/{id}': {
            get: {
                tags: ['Manager'],
                summary: 'List guests',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/event-images/get-by-event/{id}': {
            get: {
                tags: ['Manager'],
                summary: 'List event images',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/notifications/list': {
            get: {
                tags: ['Manager'],
                summary: 'List notifications',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/events/pending-review': {
            get: {
                tags: ['Admin'],
                summary: 'Events pending approval',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'OK' }, 403: { description: 'Admin only' } }
            }
        },
        '/manager/events/{id}/approve': {
            post: {
                tags: ['Admin'],
                summary: 'Approve event',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Published' } }
            }
        },
        '/manager/events/{id}/reject': {
            post: {
                tags: ['Admin'],
                summary: 'Reject event (back to draft)',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: { 200: { description: 'Rejected' } }
            }
        },
        '/manager/admin/overview': {
            get: {
                tags: ['Admin'],
                summary: 'Admin overview stats',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/admin/users': {
            get: {
                tags: ['Admin'],
                summary: 'List users',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'OK' } }
            }
        },
        '/manager/admin/users/{id}/role': {
            post: {
                tags: ['Admin'],
                summary: 'Update user role',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    role: { type: 'string', enum: ['customer', 'organizer', 'admin'] }
                                }
                            }
                        }
                    }
                },
                responses: { 200: { description: 'Updated' } }
            }
        },
        '/manager/admin/users/{id}/password': {
            post: {
                tags: ['Admin'],
                summary: 'Update user password',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['password'],
                                properties: {
                                    password: { type: 'string', minLength: 8 }
                                }
                            }
                        }
                    }
                },
                responses: { 200: { description: 'Updated' } }
            }
        },
        '/manager/admin/events/{id}/status': {
            post: {
                tags: ['Admin'],
                summary: 'Set event status',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: { status: { type: 'string' } }
                            }
                        }
                    }
                },
                responses: { 200: { description: 'Updated' } }
            }
        },
        '/manager/admin/events/{id}/feature': {
            post: {
                tags: ['Admin'],
                summary: 'Feature / unfeature event',
                security: [{ bearerAuth: [] }],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: { featured: { type: 'boolean' } }
                            }
                        }
                    }
                },
                responses: { 200: { description: 'Updated' } }
            }
        }
    }
};
