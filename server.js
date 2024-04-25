import express from 'express';
import fetch from 'node-fetch';
import 'dotenv/config';
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

// host static files
app.use(express.static("client"));


const port = process.env.PORT || 3000;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const endpoint_url = 'https://api-m.sandbox.paypal.com';

/*Generate access Token*/

const generateAccessToken = async () => {
    try {
      if (!client_id || !client_secret) {
        throw new Error("MISSING_API_CREDENTIALS");
      }
      const auth = Buffer.from(
        client_id + ":" + client_secret,
      ).toString("base64");
      const response = await fetch(`${endpoint_url}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });
  
      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Failed to generate Access Token:", error);
    }
  };

/* Create an order to start the transaction.*/

const createOrder = async (cart) => {
    console.log(
      "shopping cart information passed from the frontend createOrder() callback:",
      cart,
    );
  
    const accessToken = await generateAccessToken();
    const url = `${endpoint_url}/v2/checkout/orders`;
    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: "100.00",
          },
        },
      ],
    };
  
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
      body: JSON.stringify(payload),
    });
  
    return handleResponse(response);
  };
  
/* Capture payment for the created order to complete the transaction. */

const captureOrder = async (orderID) => {
    const accessToken = await generateAccessToken();
    const url = `${endpoint_url}/v2/checkout/orders/${orderID}/capture`;
  
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    return handleResponse(response);
  };
  
async function handleResponse(response) {
    try {
        const jsonResponse = await response.json();
        return {
            jsonResponse,
            httpStatusCode: response.status,
        };
    } catch (err) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
    }
}
  
app.post("/api/orders", async (req, res) => {
    try {
        const { cart } = req.body;
        const { jsonResponse, httpStatusCode } = await createOrder(cart);
        res.status(httpStatusCode).json(jsonResponse);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to create order." });
    }
  });
  
app.post("/api/orders/:orderID/capture", async (req, res) => {
    try {
        const { orderID } = req.params;
        const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
        res.status(httpStatusCode).json(jsonResponse);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to capture order." });
    }
});

/* Refund a transaction */

const refundTransaction = async (capture_id) => {
  const accessToken = await generateAccessToken();
  const url = `${endpoint_url}/v2/payments/captures/${capture_id}/refund`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return handleResponse(response);
};

app.post("/api/captures/:capture_id/refund", async(req, res) =>{
  try {
    const {capture_id} = req.params  
    const { jsonResponse, httpStatusCode } = await refundTransaction(capture_id);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to refund:", error);
    res.status(500).json({ error: "Failed to refund order." });
  }
});

// serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.resolve("index.html"));
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
})