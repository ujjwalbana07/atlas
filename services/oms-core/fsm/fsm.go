package fsm

import (
	"fmt"

	"github.com/atlas/services/common/model"
)

type StateMachine struct {
	State model.OrderStatus
}

func NewStateMachine() *StateMachine {
	return &StateMachine{State: model.OrderStatusNew}
}

func (sm *StateMachine) Apply(event model.OrderEvent) error {
	// Replay logic: update state based on event
	// This is used for both live processing and recovery
	switch event.Type {
	case "ORDER_CREATED":
		sm.State = model.OrderStatusPendingSubmit
	case "ORDER_ACCEPTED":
		sm.State = model.OrderStatusLive
	case "ORDER_FILLED":
		sm.State = model.OrderStatusFilled
	case "ORDER_PARTIALLY_FILLED":
		sm.State = model.OrderStatusPartiallyFilled
	case "ORDER_REJECTED":
		sm.State = model.OrderStatusRejected
	case "ORDER_CANCELED":
		sm.State = model.OrderStatusCanceled
	}
	return nil
}

func (sm *StateMachine) CanTransition(to model.OrderStatus) error {
	// Strict transition rules
	switch sm.State {
	case model.OrderStatusNew:
		if to == model.OrderStatusPendingSubmit {
			return nil
		}
	case model.OrderStatusPendingSubmit:
		if to == model.OrderStatusLive || to == model.OrderStatusRejected || to == model.OrderStatusPendingSubmit {
			return nil
		}
	case model.OrderStatusLive:
		if to == model.OrderStatusFilled || to == model.OrderStatusPartiallyFilled || to == model.OrderStatusCancelPending || to == model.OrderStatusReplacePending {
			return nil
		}
	case model.OrderStatusPartiallyFilled:
		if to == model.OrderStatusFilled || to == model.OrderStatusCancelPending || to == model.OrderStatusReplacePending {
			return nil
		}
	case model.OrderStatusCancelPending:
		if to == model.OrderStatusCanceled {
			return nil
		}
	case model.OrderStatusReplacePending:
		if to == model.OrderStatusLive {
			return nil
		}
	}
	return fmt.Errorf("invalid transition from %s to %s", sm.State, to)
}
