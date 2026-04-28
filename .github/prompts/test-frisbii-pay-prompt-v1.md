Run the Test following the procedure in document D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend\.github\prompts\test-frisbii-pay-guest-checkout.prompt.md via Playwright. This file was created to verify the checkout process of plugin D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend

The goal is to test that checkout completes successfully, the user is redirected to the Thank You page, and the system correctly clears cart items.

If the plugin workflow has issues, investigate the code in the reference folders below and create a summary document of problems found:
D:\my_cource\medusa\002\medusa-store
D:\my_cource\medusa\002\medusa-store-storefront
D:\my_cource\medusa\001\medusa-plugin-frisbii-pay
D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend

---------------

Reference 1
When I checkout using "Manual Payment" (pp_system_default), which is MedusaJS's default payment, the result is: upon placing the order, the website creates the order and correctly redirects to the Thank You page, and cart items are correctly cleared.
Example Thank You page: http://localhost:8000/dk/order/order_01KPPY5X35TXEE9D3QH5SAJN06/confirmed

However, I want this same behaviour to work correctly with our plugin Frisbii Pay.

Reference 2
Test servers
I have started both servers with the npm run dev command.

If a server restart is needed, do not attempt to do it yourself — ask me to handle it.

Backend: http://localhost:9000/app/ 
D:\my_cource\medusa\002\medusa-store
Login: http://localhost:9000/app
User: boyd@radarsofthouse.dk
Pass: Test#1234

Frontend: http://localhost:8000/
D:\my_cource\medusa\002\medusa-store-storefront

Reference 3
Our reference plugin is:
\\wsl.localhost\Ubuntu-22.04\home\radaradmin\billwerk_web\wp\wp-content\plugins\reepay-checkout-gateway
You can study the checkout process of the reference plugin from the document:
\\wsl.localhost\Ubuntu-22.04\home\radaradmin\billwerk_web\wp\wp-content\debug\CHECKOUT_FLOW.md

---------------

You have access to all files and folders listed in the reference folders above.

If you have any questions, ask before taking any action.