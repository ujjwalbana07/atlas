module github.com/atlas/services/order-gateway

go 1.25.7

require (
	github.com/atlas/services/common v0.0.0-00010101000000-000000000000
	github.com/google/uuid v1.6.0
	github.com/gorilla/websocket v1.5.3
)

require (
	github.com/klauspost/compress v1.15.9 // indirect
	github.com/pierrec/lz4/v4 v4.1.15 // indirect
	github.com/segmentio/kafka-go v0.4.50 // indirect
)

replace github.com/atlas/services/common => ../common
