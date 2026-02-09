'use client';
import { useCallback } from 'react';
import { navigateToThankYou } from '@/lib/navigation';

export default function useSubmitOrder(args: any) {
  const submit = useCallback(async () => {
    const {
      isSubmitting,
      setPaymentFailure,
      validateForm,
      setErrors,
      toast,
      t,
      deriveCity,
      subtotal,
      transport,
      total,
      formData,
      orderItems,
      setIsSubmitting,
      ordersEnabled,
      ordersSource,
      scheduleConfirmChecked,
      setPaymentInProgress,
      mobileMoneyPhones,
      formatPhoneNumber,
      initiatePayment,
      createOrder,
      setSuppressEmptyCartRedirect,
      setPreventPersistence,
      clearAllCheckoutClientState,
      clearCart,
      setOrderItems,
      user,
      router,
      validatePaymentRequest,
      selectedAddress: _selectedAddress,
      effectiveIsRetry,
      effectiveRetryOrderId,
      clearBuyNowItem,
      isBuyNowFlow,
    } = args;

    // Track whether we've navigated to an order page so the checkout
    // empty-cart redirect doesn't race and send users back to the landing
    // page after a successful navigation to the order details page.
    let navigatedToOrder = false;

    if (isSubmitting) return;

    try {
      try {
        setPaymentFailure?.(null);
      } catch (_e) {}

      const formErrors = validateForm ? validateForm() : {};
      if (formErrors && Object.keys(formErrors).length > 0) {
        setErrors?.(formErrors);
        const msgs = Object.values(formErrors).filter(Boolean);
        if (msgs.length > 0) {
          toast.error(String(msgs[0]));
        } else {
          toast.error('Please fix the highlighted errors and try again.');
        }
        return;
      }

      if (!orderItems || orderItems.length === 0) {
        toast.error(t('cart.empty'));
        return;
      }

      setIsSubmitting?.(true);
      setErrors?.({});

      if (ordersEnabled === false) {
        if (ordersSource === 'admin') {
          toast.error(
            args.ordersDisabledMessage ||
              t('checkout.ordersDisabledMessage') ||
              'Ordering is currently disabled by the admin.'
          );
          setIsSubmitting?.(false);
          return;
        }

        if (ordersSource === 'schedule') {
          if (!scheduleConfirmChecked) {
            toast.error(
              t('checkout.confirmScheduleDelivery') ||
                'Please confirm you want this order delivered tomorrow during working hours.'
            );
            setIsSubmitting?.(false);
            return;
          }
        }
      }

      try {
        const derivedCity = deriveCity ? deriveCity() : '';

        // Handle various auth providers (Google, email/password, etc.)
        const derivedFullNameForOrder =
          (user &&
            user.user_metadata &&
            (user.user_metadata.full_name ||
              user.user_metadata.name ||
              user.user_metadata.display_name)) ||
          `${formData.fullName || ''}`.trim() ||
          (user?.email ? user.email.split('@')[0] : 'Customer');

        const [derivedFirstName, ...derivedLastParts] = (
          derivedFullNameForOrder || 'Customer'
        ).split(' ');
        const derivedLastName = derivedLastParts.join(' ') || '';

        // Always ensure we have an email - use placeholder if not provided
        // This handles both guest users AND authenticated users without email
        const customerEmail =
          (formData.email || '').trim() ||
          `guest-${
            (formData.phone || args.selectedAddress?.phone || '').replace(
              /\D/g,
              ''
            ) || Date.now()
          }@nihemart.rw`;

        const orderData: any = {
          order: {
            user_id: user?.id || undefined,
            subtotal: subtotal,
            tax: transport,
            total: total,
            customer_email: customerEmail,
            customer_first_name: (derivedFirstName || '').trim(),
            customer_last_name: (derivedLastName || '').trim(),
            customer_phone:
              (
                (args.selectedAddress?.phone || formData.phone || '') as string
              ).trim() || undefined,
            delivery_address: (
              (args.selectedAddress?.street ??
                args.selectedAddress?.display_name ??
                formData.address ??
                '') as string
            ).trim(),
            delivery_city: (
              (derivedCity ||
                args.selectedAddress?.city ||
                formData.city ||
                '') as string
            ).trim(),
            status: 'pending',
            payment_method: args.paymentMethod || 'cash_on_delivery',
            delivery_notes: (formData.delivery_notes || '').trim() || undefined,
          },
          items: orderItems.map((item: any) => {
            const explicitProductId = item.product_id as string | undefined;
            let resolvedProductId: string | undefined = explicitProductId;
            if (!resolvedProductId && typeof item.id === 'string') {
              const idStr = item.id as string;
              if (idStr.length === 36) resolvedProductId = idStr;
              else if (idStr.length >= 73 && idStr[36] === '-')
                resolvedProductId = idStr.slice(0, 36);
              else resolvedProductId = idStr;
            }
            const product_id = resolvedProductId ?? String(item.id);
            return {
              product_id,
              product_variation_id:
                item.product_variation_id ?? item.variation_id ?? undefined,
              product_name: item.name,
              product_sku: item.sku ?? undefined,
              // Map cart 'variant' field to order 'variation_name'
              variation_name: item.variation_name ?? item.variant ?? undefined,
              price: item.price,
              quantity: item.quantity,
              total: item.price * item.quantity,
            };
          }),
        };

        if (formData.delivery_notes)
          orderData.order.delivery_notes = formData.delivery_notes;

        if (
          ordersEnabled === false &&
          ordersSource === 'schedule' &&
          args.scheduleNotes
        ) {
          try {
            // Store schedule notes in a dedicated field so they are
            // easier to query and display separately from generic
            // delivery instructions.
            orderData.order.schedule_notes = (
              (args.scheduleNotes || '') as string
            ).trim();
          } catch (_e) {
            // console.warn('Failed to set schedule_notes:', _e);
          }
        }

        // Orders can proceed with checkbox confirmation during non-working hours
        // No delivery_time field required

        if (!createOrder || typeof createOrder.mutate !== 'function') {
          // console.error('createOrder mutation is not available', createOrder);
          toast.error(
            'Unable to submit order right now. Please try again later.'
          );
          setIsSubmitting?.(false);
          return;
        }

        // If paymentMethod indicates payment already verified, create order immediately and attempt linking
        if (
          args.paymentMethod &&
          args.paymentMethod !== 'cash_on_delivery' &&
          args.paymentVerified
        ) {
          try {
            if (setSuppressEmptyCartRedirect)
              setSuppressEmptyCartRedirect(true);
            if (setPreventPersistence) setPreventPersistence(true);
            createOrder.mutate(orderData, {
              onSuccess: async (createdOrder: any) => {
                const created =
                  createdOrder && createdOrder.order
                    ? createdOrder.order
                    : createdOrder;
                try {
                  // Clear cart ONLY if NOT a Buy Now order
                  if (!isBuyNowFlow && clearCart) {
                    clearCart();
                  }
                } catch (_e) {}
                if (setOrderItems) setOrderItems([]);

                try {
                  // Payment-order linking is handled automatically by the backend
                  // when creating orders from payment sessions, so no manual linking needed
                  // Clean up session storage reference if present
                  const ref =
                    typeof window !== 'undefined'
                      ? sessionStorage.getItem('kpay_reference')
                      : null;
                  if (ref) {
                    try {
                      sessionStorage.removeItem('kpay_reference');
                    } catch (_e) {}
                  }

                  try {
                    if (clearAllCheckoutClientState)
                      clearAllCheckoutClientState();
                  } catch (_e) {
                    // console.error('Failed to clear checkout state:', _e);
                  }

                  // Payment-order linking is handled automatically by the backend
                  // No manual linking needed, so no error check required

                  // Guests cannot manage orders — redirect immediately
                  if (user && (user as any).id) {
                    try {
                      // console.debug(
                      //   'useSubmitOrder: navigating to user order page',
                      //   (created as any)?.id
                      // );
                      await router.push(`/orders/${(created as any)?.id}`);
                    } catch (_navErr) {
                      // console.error(
                      //   'Navigation to /orders/:id failed:',
                      //   navErr
                      // );
                    }
                  } else {
                    try {
                      // Attempt to send confirmation email reliably while navigating.
                      const payload = JSON.stringify({
                        order: created,
                      });
                      try {
                        // Prefer navigator.sendBeacon so navigation isn't blocked
                        if (
                          typeof window !== 'undefined' &&
                          typeof navigator !== 'undefined' &&
                          typeof navigator.sendBeacon === 'function'
                        ) {
                          const url =
                            window.location.origin +
                            '/api/orders/send-confirmation-email';
                          const blob = new Blob([payload], {
                            type: 'application/json',
                          });
                          try {
                            navigator.sendBeacon(url, blob as any);
                          } catch (_e) {
                            // fall through to fetch
                            fetch(url, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: payload,
                              keepalive: true as any,
                            }).catch(() => {});
                          }
                        } else {
                          // Fallback to keepalive fetch
                          fetch('/api/orders/send-confirmation-email', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: payload,
                            keepalive: true as any,
                          }).catch(() => {});
                        }
                      } catch (_e) {}

                      // Navigate first for immediate UX
                      try {
                        // console.debug(
                        //   'useSubmitOrder: navigating to /thank-you for guest'
                        // );
                        navigateToThankYou(router);
                      } catch (_navErr) {
                        // console.error(
                        //   'Navigation to /thank-you failed:',
                        //   navErr
                        // );
                      }
                    } catch (_e) {
                      // ignore navigation errors
                    }

                    // Fire-and-forget cleanup to avoid delaying redirect
                    setTimeout(() => {
                      try {
                        toast.success(
                          `Order #${
                            (created as any).order_number
                          } has been created successfully!`
                        );
                      } catch (_e) {}
                      try {
                        if (clearAllCheckoutClientState)
                          clearAllCheckoutClientState();
                      } catch (_e) {}
                      try {
                        // Clear cart ONLY if NOT a Buy Now order
                        if (!isBuyNowFlow && clearCart) {
                          clearCart();
                        }
                      } catch (_e) {}
                      try {
                        if (setOrderItems) setOrderItems([]);
                      } catch (_e) {}
                    }, 0);
                  }
                } catch (_outerError) {
                  // console.error('Unexpected error during payment linking', {
                  //   orderId: (created as any)?.id,
                  //   error: outerError,
                  // });
                  // Navigate immediately for guests, then run cleanup
                  try {
                    if (user && (user as any).id) {
                      navigatedToOrder = true;
                      router.push(`/orders/${(created as any)?.id}`);
                    } else {
                      navigateToThankYou(router);
                    }
                  } catch (_e) {}
                  try {
                    toast(
                      'Order created but an unexpected error occurred during payment linking. Your checkout data has been preserved.'
                    );
                  } catch (_e) {}
                }
              },
              onError: (error: any) => {
                // console.error('createOrder.onError', error);
                try {
                  if (setPaymentInProgress) setPaymentInProgress(false);
                } catch (_e) {}
                if (setPreventPersistence) setPreventPersistence(false);

                // Handle out-of-stock errors
                const errorMessage =
                  error?.response?.data?.error ||
                  error?.message ||
                  'Unknown error';
                if (errorMessage.includes('Insufficient stock')) {
                  toast.error(errorMessage);
                } else {
                  toast.error(`Failed to create order: ${errorMessage}`);
                }
              },
              onSettled: () => {
                setIsSubmitting?.(false);
                if (!navigatedToOrder) {
                  if (setSuppressEmptyCartRedirect)
                    setSuppressEmptyCartRedirect(false);
                }
              },
            });
          } catch (error: any) {
            // console.error('Order creation failed (sync):', error);
            try {
              if (setPaymentInProgress) setPaymentInProgress(false);
            } catch (_e) {}
            toast.error(
              `Failed to create order: ${error?.message || 'Unknown error'}`
            );
            setIsSubmitting?.(false);
          }

          return;
        }

        // ONE-WAY FLOW: Create order FIRST, then initiate payment
        if (args.paymentMethod && args.paymentMethod !== 'cash_on_delivery') {
          // For retry mode, we already have an orderId
          if (effectiveIsRetry && effectiveRetryOrderId) {
            try {
              // console.log(
              //   '[useSubmitOrder] Retrying payment for order:',
              //   effectiveRetryOrderId,
              //   'with method:',
              //   args.paymentMethod
              // );
              if (setPaymentInProgress) setPaymentInProgress(true);

              const customerPhone =
                args.paymentMethod === 'mtn_momo' ||
                args.paymentMethod === 'airtel_money'
                  ? mobileMoneyPhones[args.paymentMethod] ||
                    formatPhoneNumber(
                      args.selectedAddress?.phone || formData.phone || ''
                    )
                  : formatPhoneNumber(
                      args.selectedAddress?.phone || formData.phone || ''
                    );

              const derivedFullName =
                (user &&
                  user.user_metadata &&
                  user.user_metadata.full_name &&
                  user.user_metadata.full_name.trim()) ||
                `${formData.fullName || ''}`.trim();

              const paymentCustomerName =
                derivedFullName || formData.fullName || 'Guest Customer';
              const paymentCustomerEmail = (formData.email || '').trim();

              const retryRequest = {
                orderId: effectiveRetryOrderId,
                amount: total,
                customerName: paymentCustomerName,
                customerEmail: paymentCustomerEmail,
                customerPhone,
                paymentMethod: args.paymentMethod,
                redirectUrl: `${window.location.origin}/payment/${effectiveRetryOrderId}`,
              };

              const retryResponse = await fetch('/api/payments/retry', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(retryRequest),
              });

              const retryData = await retryResponse.json();

              if (!retryResponse.ok) {
                throw new Error(
                  retryData.error || retryData.message || 'Retry payment failed'
                );
              }

              if (retryData.success && retryData.data) {
                const checkoutUrl =
                  retryData.data.url ||
                  retryData.data.redirecturl ||
                  retryData.checkoutUrl;
                if (checkoutUrl) {
                  toast.success('Redirecting to payment gateway...');
                  window.location.href = checkoutUrl;
                  return;
                }
                const paymentId =
                  retryData.paymentId || retryData.data?.paymentId;
                if (paymentId) {
                  toast.success('Redirecting to payment page...');
                  router.push(`/payment/${paymentId}`);
                  return;
                }
              }

              if (setPaymentInProgress) setPaymentInProgress(false);
              setIsSubmitting?.(false);
              toast.error('Payment retry failed. Please try again.');
              return;
            } catch (err: any) {
              // console.error('Payment retry failed:', err);
              if (setPaymentInProgress) setPaymentInProgress(false);
              setIsSubmitting?.(false);
              toast.error(
                err?.message || 'Failed to retry payment. Please try again.'
              );
              return;
            }
          }

          // NEW FLOW: Initiate payment FIRST with orderData, order will be created after payment succeeds
          if (setSuppressEmptyCartRedirect) setSuppressEmptyCartRedirect(true);
          if (setPaymentInProgress) setPaymentInProgress(true);

          try {
            const customerPhone =
              args.paymentMethod === 'mtn_momo' ||
              args.paymentMethod === 'airtel_money'
                ? mobileMoneyPhones[args.paymentMethod] ||
                  formatPhoneNumber(
                    args.selectedAddress?.phone || formData.phone || ''
                  )
                : formatPhoneNumber(
                    args.selectedAddress?.phone || formData.phone || ''
                  );

            const derivedFullName =
              (user &&
                user.user_metadata &&
                user.user_metadata.full_name &&
                user.user_metadata.full_name.trim()) ||
              `${formData.fullName || ''}`.trim();

            const paymentCustomerName =
              derivedFullName || formData.fullName || 'Guest Customer';
            const paymentCustomerEmail = (formData.email || '').trim();

            // Send orderData instead of orderId - order will be created after payment succeeds
            // For unified checkout flow, set redirectUrl to point back to checkout
            // This allows KPay to redirect back to checkout after payment
            const redirectUrl = args.onPaymentInitiated
              ? `${typeof window !== 'undefined' ? window.location.origin : ''}/checkout?payment=return&reference={reference}`
              : undefined; // Legacy flow - backend will generate default redirectUrl

            const paymentRequest: any = {
              orderData: orderData, // Send full order data
              amount: total,
              customerName: paymentCustomerName,
              customerEmail: paymentCustomerEmail,
              customerPhone,
              customerNumber: customerPhone,
              paymentMethod: args.paymentMethod,
              redirectUrl: redirectUrl, // For unified flow, point back to checkout
              orderDetails: `Order for ${paymentCustomerName}`,
            };

            // console.log(
            //   '[useSubmitOrder] Initiating payment with orderData (order will be created after payment):',
            //   {
            //     paymentMethod: paymentRequest.paymentMethod,
            //     amount: paymentRequest.amount,
            //     hasOrderData: !!paymentRequest.orderData,
            //   }
            // );

            const validationErrors = validatePaymentRequest
              ? validatePaymentRequest(paymentRequest)
              : [];
            if (validationErrors.length > 0) {
              if (setPaymentInProgress) setPaymentInProgress(false);
              setIsSubmitting?.(false);
              toast.error(`Payment validation failed: ${validationErrors[0]}`);
              return;
            }

            const paymentResult = await initiatePayment(paymentRequest);

            if (paymentResult.success) {
              toast.success('Redirecting to payment gateway...');

              // Get the payment session reference
              const ref =
                paymentResult.reference ||
                paymentResult.data?.reference ||
                paymentResult.sessionId ||
                null;

              if (ref) {
                try {
                  sessionStorage.setItem('kpay_reference', String(ref));
                } catch (_e) {}
              }

              // First try to redirect to external checkout URL if available
              // For card payments, this is critical - we must redirect to KPay checkout
              const checkoutUrl =
                paymentResult.checkoutUrl ||
                paymentResult.data?.url ||
                paymentResult.data?.redirecturl ||
                paymentResult.data?.redirectUrl ||
                paymentResult.data?.checkout_url ||
                null;

              // console.log('[useSubmitOrder] Payment result:', {
              //   success: paymentResult.success,
              //   checkoutUrl: checkoutUrl || 'NOTFOUND',
              //   hasData: !!paymentResult.data,
              //   dataUrl: paymentResult.data?.url,
              //   reference: ref,
              // });

              // For card payments, always redirect to checkout URL if available
              // For mobile money, redirect to our payment page
              const isCardPayment =
                args.paymentMethod === 'visa_card' ||
                args.paymentMethod === 'mastercard' ||
                args.paymentMethod?.includes('card');

              // Check if there's a callback for handling payment (unified checkout flow)
              if (args.onPaymentInitiated) {
                // console.log(
                //   '[useSubmitOrder] Using payment callback instead of redirecting'
                // );
                // Store reference for when user returns from KPay
                if (ref) {
                  try {
                    sessionStorage.setItem('kpay_reference', String(ref));
                  } catch (_e) {
                    // console.warn(
                    //   '[useSubmitOrder] Failed to store reference:',
                    //   _e
                    // );
                  }
                }
                // Clear any previous payment failures before initiating new payment
                // This ensures users don't see errors from previous failed attempts
                try {
                  setPaymentFailure?.(null);
                } catch (_e) {
                  // console.warn('Failed to clear payment failure state:', _e);
                }

                // Call the callback with payment info
                args.onPaymentInitiated({
                  reference: ref,
                  checkoutUrl: checkoutUrl || null,
                  isCardPayment,
                });
                return;
              }

              // Legacy redirect flow (for backward compatibility)
              if (checkoutUrl) {
                // console.log(
                //   '[useSubmitOrder] Redirecting to KPay checkout:',
                //   checkoutUrl
                // );
                // Store reference for when user returns from KPay
                if (ref) {
                  try {
                    sessionStorage.setItem('kpay_reference', String(ref));
                  } catch (_e) {
                    // console.warn(
                    //   '[useSubmitOrder] Failed to store reference:',
                    //   _e
                    // );
                  }
                }
                window.location.href = String(checkoutUrl);
                return;
              }

              // For card payments, if no checkout URL, this is an error
              if (isCardPayment) {
                // console.error(
                //   '[useSubmitOrder] Card payment initiated but no checkout URL found in response:',
                //   paymentResult
                // );
                if (setPaymentInProgress) setPaymentInProgress(false);
                setIsSubmitting?.(false);
                toast.error(
                  'Payment initiated but checkout URL not available. Please contact support.'
                );
                return;
              }

              // For mobile money payments, redirect to our payment page using the reference
              if (ref) {
                try {
                  router.push(`/payment/${ref}`);
                  return;
                } catch (_e) {
                  window.location.href = `${window.location.origin}/payment/${ref}`;
                  return;
                }
              }

              // Fallback: show error
              if (setPaymentInProgress) setPaymentInProgress(false);
              setIsSubmitting?.(false);
              toast.error(
                'Payment initiated but no redirect URL available. Please check your payment status.'
              );
            } else {
              if (setPaymentInProgress) setPaymentInProgress(false);
              setIsSubmitting?.(false);
              toast.error(
                `Payment initiation failed: ${
                  paymentResult.error || 'Unknown error'
                }`
              );
            }
          } catch (err: any) {
            // console.error('Payment initiation failed:', err);
            if (setPaymentInProgress) setPaymentInProgress(false);
            setIsSubmitting?.(false);
            toast.error(
              err?.message || 'Failed to start payment. Please try again.'
            );
          } finally {
            setIsSubmitting?.(false);
            if (setSuppressEmptyCartRedirect)
              setSuppressEmptyCartRedirect(false);
          }
          return;
        }

        // Cash on delivery: create the order now
        if (setSuppressEmptyCartRedirect) setSuppressEmptyCartRedirect(true);
        createOrder.mutate(orderData, {
          onSuccess: async (createdOrder: any) => {
            const created =
              createdOrder && createdOrder.order
                ? createdOrder.order
                : createdOrder;
            if (setPreventPersistence) setPreventPersistence(true);
            try {
              if (clearAllCheckoutClientState) clearAllCheckoutClientState();
            } catch (_e) {
              // console.error('Failed to clear checkout state:', _e);
            }

            // Clear cart ONLY if this is a cart order (NOT Buy Now)
            // Buy Now orders should NOT clear the cart
            try {
              if (!isBuyNowFlow && clearCart) {
                clearCart();
                // console.log('[useSubmitOrder] Cart cleared (cart order)');
              } else if (isBuyNowFlow) {
                // console.log('[useSubmitOrder] Cart preserved (Buy Now order)');
              }
            } catch (_e) {
              // console.error('Failed to clear cart:', _e);
            }

            // Clear buy now item if this was a buy now flow
            try {
              if (isBuyNowFlow && clearBuyNowItem) {
                clearBuyNowItem();
                // console.log('[useSubmitOrder] Buy now item cleared');
              }
            } catch (_e) {
              // console.error('Failed to clear buy now item:', _e);
            }

            if (setOrderItems) setOrderItems([]);

            // Redirect guests immediately, then cleanup asynchronously
            if (user && (user as any).id) {
              try {
                // console.debug(
                //   'useSubmitOrder: navigating to user order page (COD)',
                //   created?.id
                // );
                navigatedToOrder = true;
                await router.push(`/orders/${created?.id}`);
              } catch (_navErr) {
                // console.error('Navigation to /orders/:id failed:', navErr);
              }
              try {
                toast.success(
                  `Order #${created.order_number} has been created successfully!`
                );
              } catch (_e) {}
            } else {
              try {
                // console.debug(
                //   'useSubmitOrder: navigating to /thank-you for guest (COD)'
                // );
                navigateToThankYou(router);
              } catch (_navErr) {
                // console.error('Navigation to /thank-you failed:', navErr);
              }
              setTimeout(() => {
                try {
                  toast.success(
                    `Order #${created.order_number} has been created successfully!`
                  );
                } catch (_e) {}
              }, 0);
            }
          },
          onError: (error: any) => {
            // console.error('createOrder.onError', error);
            try {
              if (setPaymentInProgress) setPaymentInProgress(false);
            } catch (_e) {}

            const errorMessage =
              error?.response?.data?.error || error?.message || 'Unknown error';

            if (errorMessage.includes('Insufficient stock')) {
              toast.error(errorMessage);
            } else if (errorMessage.includes('uuid')) {
              toast.error(
                'Invalid product data. Please refresh and try again.'
              );
            } else if (errorMessage.includes('foreign key')) {
              toast.error(
                'Product no longer available. Please update your cart.'
              );
            } else {
              toast.error(`Failed to create order: ${errorMessage}`);
            }
          },
          onSettled: () => {
            setIsSubmitting?.(false);
            if (!navigatedToOrder) {
              if (setSuppressEmptyCartRedirect)
                setSuppressEmptyCartRedirect(false);
            }
          },
        });
      } catch (error: any) {
        // console.error('Order creation failed (sync):', error);
        try {
          if (setPaymentInProgress) setPaymentInProgress(false);
        } catch (_e) {}
        toast.error(
          `Failed to create order: ${error?.message || 'Unknown error'}`
        );
        setIsSubmitting?.(false);
      }
    } catch (_err) {
      // console.error('Unhandled error in submit order:', _err);
      setIsSubmitting?.(false);
      toast.error('Failed to submit order. Please try again.');
    }
  }, [args]);

  return submit;
}
