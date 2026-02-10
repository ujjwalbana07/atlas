package db

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

type DynamoClient struct {
	Client *dynamodb.Client
}

func NewDynamoClient(ctx context.Context, region string, endpoint string) (*DynamoClient, error) {
	var optFns []func(*config.LoadOptions) error

	if region != "" {
		optFns = append(optFns, config.WithRegion(region))
	}

	// Only apply endpoint resolver if an endpoint is provided
	if endpoint != "" {
		resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:           endpoint,
				SigningRegion: region,
			}, nil
		})
		optFns = append(optFns, config.WithEndpointResolverWithOptions(resolver))
	}

	cfg, err := config.LoadDefaultConfig(ctx, optFns...)
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %w", err)
	}

	client := dynamodb.NewFromConfig(cfg)
	return &DynamoClient{Client: client}, nil
}

func (d *DynamoClient) CreateTableIfNotExists(ctx context.Context, input *dynamodb.CreateTableInput) error {
	_, err := d.Client.CreateTable(ctx, input)
	if err != nil {
		log.Printf("Table creation log (ignore if exists): %v", err)
	}
	return nil
}

func (d *DynamoClient) GetItem(ctx context.Context, input *dynamodb.GetItemInput) (*dynamodb.GetItemOutput, error) {
	return d.Client.GetItem(ctx, input)
}

func (d *DynamoClient) PutItem(ctx context.Context, input *dynamodb.PutItemInput) (*dynamodb.PutItemOutput, error) {
	return d.Client.PutItem(ctx, input)
}

func (d *DynamoClient) UpdateItem(ctx context.Context, input *dynamodb.UpdateItemInput) (*dynamodb.UpdateItemOutput, error) {
	return d.Client.UpdateItem(ctx, input)
}

func (d *DynamoClient) PutItemConditional(ctx context.Context, input *dynamodb.PutItemInput) (*dynamodb.PutItemOutput, error) {
	return d.Client.PutItem(ctx, input)
}

func (d *DynamoClient) DescribeTable(ctx context.Context, input *dynamodb.DescribeTableInput) (*dynamodb.DescribeTableOutput, error) {
	return d.Client.DescribeTable(ctx, input)
}
