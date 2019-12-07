import * as AWS  from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'

const XAWS = AWSXRay.captureAWS(AWS)

export class TodoAccess {

    constructor(
      private s3 = new AWS.S3({
        signatureVersion: 'v4'
      }),
        private readonly docClient: DocumentClient = createDynamoDBClient(),
        private readonly todoTable = process.env.TODO_TABLE,
        private readonly bucketName = process.env.IMAGES_S3_BUCKET,
        private readonly urlExpiration = process.env.SIGNED_URL_EXPIRATION
    ) { }

    async GetAllTodos(userId: string): Promise<TodoItem[]> {
        console.log('Getting all todos')

        const result = await this.docClient.query({
          TableName: this.todoTable,
          KeyConditionExpression: "#userId = :userId",
          ExpressionAttributeNames:{
              "#userId": "userId"
          },
          ExpressionAttributeValues: {
              ":userId": userId
          }
        }).promise()

        const items = result.Items
        return items as TodoItem[]
      }

      async CreateTodo(todo): Promise<TodoItem> {
        console.log('creating todo')

        await this.docClient.put({
          TableName: this.todoTable,
          Item: todo
        }).promise()
        return todo;
      }

      // for key param, you need partition key and other key attributes for this to work ⬇️
      // https://stackoverflow.com/questions/42757872/the-provided-key-element-does-not-match-the-schema-error-when-getting-an-item/42759071
      async DeleteTodo(userId: string, todoId: string): Promise<TodoItem[]> {
        console.log('deleting todo')

        await this.docClient.delete({
          TableName: this.todoTable,
          Key: { userId, todoId } // need partition key and sort key for this to work
        }).promise()
        return [];
      }

      async UpdateTodo(userId: string, todoId: string, updatedTodo): Promise<TodoItem> {
        console.log('updating todo')

        await this.docClient.update({
          TableName: this.todoTable,
          Key: { userId, todoId },
          UpdateExpression: 'set #name = :n, dueDate = :dd, done = :d',
          ExpressionAttributeValues: {
              ':na': updatedTodo.name,
              ':du': updatedTodo.dueDate,
              ':do': updatedTodo.done
          },
          ExpressionAttributeNames: {
              "#name": "name"
          }
        }).promise();
        return updatedTodo;
      }

      async GenerateUrl(userId: string, todoId: string): Promise<string> {
        console.log('generating todo')

        const url = this.s3.getSignedUrl('putObject', {
          Bucket: this.bucketName,
          Key: todoId,
          Expires: this.urlExpiration
        })
        const newUrl = url.split('?')[0];

        await this.docClient.update({
          TableName: this.todoTable,
          Key: { userId, todoId },
          UpdateExpression: 'set attachmentUrl = :a',
          ExpressionAttributeValues: {
              ':a': newUrl
          },
        }).promise();
        return url;
      }
    }

    function createDynamoDBClient() {
      if (process.env.IS_OFFLINE) {
        console.log('Creating a local DynamoDB instance')
        return new XAWS.DynamoDB.DocumentClient({
          region: 'localhost',
          endpoint: 'http://localhost:8000'
        })
      }

      return new XAWS.DynamoDB.DocumentClient()
    }
