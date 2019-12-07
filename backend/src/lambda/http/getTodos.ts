import 'source-map-support/register'

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getAllTodos } from '../../businessLogic/todo';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  const items = await getAllTodos(event);
  const response = {
    statusCode: 200,
    headers: {
        "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ items })
  };
try{
  return response;
}
catch(e){
  return{
    statusCode: 400,
    body: JSON.stringify(e)
    }
}
}
