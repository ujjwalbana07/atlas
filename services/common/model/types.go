package model

import "time"

type OrderType string
type OrderSide string
type OrderStatus string
type CommandType string

const (
	OrderTypeLimit  OrderType = "LIMIT"
	OrderTypeMarket OrderType = "MARKET"

	OrderSideBuy  OrderSide = "BUY"
	OrderSideSell OrderSide = "SELL"

	OrderStatusNew             OrderStatus = "NEW"
	OrderStatusPendingSubmit   OrderStatus = "PENDING_SUBMIT"
	OrderStatusLive            OrderStatus = "LIVE"
	OrderStatusPartiallyFilled OrderStatus = "PARTIALLY_FILLED"
	OrderStatusFilled          OrderStatus = "FILLED"
	OrderStatusCancelPending   OrderStatus = "CANCEL_PENDING"
	OrderStatusCanceled        OrderStatus = "CANCELED"
	OrderStatusReplacePending  OrderStatus = "REPLACE_PENDING"
	OrderStatusRejected        OrderStatus = "REJECTED"

	CommandTypeNew     CommandType = "NEW"
	CommandTypeCancel  CommandType = "CANCEL"
	CommandTypeReplace CommandType = "REPLACE"
)

type OrderCommand struct {
	CommandID   string      `json:"command_id"`
	Type        CommandType `json:"type"`
	OrderID     string      `json:"order_id"`
	ClientID    string      `json:"client_id"`
	Symbol      string      `json:"symbol,omitempty"`
	Side        OrderSide   `json:"side,omitempty"`
	QuantityVal float64     `json:"quantity,omitempty"`
	Price       float64     `json:"price,omitempty"`
	Timestamp   time.Time   `json:"timestamp"`
}

type ExecutionReport struct {
	ExecID    string      `json:"exec_id"`
	OrderID   string      `json:"order_id"`
	ClientID  string      `json:"client_id,omitempty"`
	Symbol    string      `json:"symbol,omitempty"`
	Side      OrderSide   `json:"side,omitempty"`
	OrderQty  float64     `json:"order_qty,omitempty"`
	Price     float64     `json:"price,omitempty"`
	Type      string      `json:"type"` // NEW, CANCELED, REPLACED, REJECTED, TRADE, STATUS
	Status    OrderStatus `json:"status"`
	LastQty   float64     `json:"last_qty,omitempty"`
	LastPx    float64     `json:"last_px,omitempty"`
	LeavesQty float64     `json:"leaves_qty"`
	CumQty    float64     `json:"cum_qty"`
	AvgPx     float64     `json:"avg_px"`
	Timestamp time.Time   `json:"timestamp"`
	Reason    string      `json:"reason,omitempty"`
}

type OrderEvent struct {
	EventID   string      `json:"event_id"`
	OrderID   string      `json:"order_id"`
	Type      string      `json:"type"` // ORDER_CREATED, ORDER_ACCEPTED, etc.
	Payload   interface{} `json:"payload"`
	Timestamp time.Time   `json:"timestamp"`
}

type RiskDecision struct {
	DecisionID string `json:"decision_id"`
	OrderID    string `json:"order_id"`
	Decision   string `json:"decision"` // APPROVED, REJECTED
	Reason     string `json:"reason,omitempty"`
}

type MarketDataType string

const (
	MarketDataTypeL2    MarketDataType = "L2"
	MarketDataTypeTrade MarketDataType = "TRADE"
)

type MarketDataUpdate struct {
	Type      MarketDataType `json:"type"`
	Symbol    string         `json:"symbol"`
	Bids      []PriceLevel   `json:"bids,omitempty"`
	Asks      []PriceLevel   `json:"asks,omitempty"`
	Trade     *TradeInfo     `json:"trade,omitempty"`
	Timestamp time.Time      `json:"timestamp"`
}

type PriceLevel struct {
	Price float64 `json:"price"`
	Qty   float64 `json:"qty"`
}

type TradeInfo struct {
	Price float64 `json:"price"`
	Qty   float64 `json:"qty"`
	Side  string  `json:"side"` // BUY/SELL (taker side)
}

type Balance struct {
	Available float64 `json:"available"`
	Reserved  float64 `json:"reserved"`
}

type Account struct {
	USD          Balance         `json:"usd"`
	BTC          Balance         `json:"btc"`
	ProcessedIds map[string]bool `json:"-"` // Internal use for idempotency
}
