import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY')! // test_sk_Z61JOxRQVEB467mvnoBwrW0X9bAq

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const { paymentKey, orderId, amount } = await req.json()

    // orderId 파싱: ORDER-{id}-{timestamp} 형식에서 실제 DB id 추출
    // 예: "ORDER-31-1760323026204" -> "31"
    const orderIdParts = orderId.replace('ORDER-', '').split('-')
    const orderIdNumber = orderIdParts[0]

    console.log('Payment confirmation request:', {
      paymentKey,
      orderId,
      parsedOrderId: orderIdNumber,
      amount
    })

    // 1. 주문 정보 조회 (검증용)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderIdNumber)
      .single()

    if (fetchError || !order) {
      console.error('Order not found:', fetchError)
      throw new Error(`주문을 찾을 수 없습니다: ${orderIdNumber}`)
    }

    // 이미 완료된 주문인지 확인
    if (order.status === 'completed' || order.payment_key) {
      console.log('Order already completed:', orderIdNumber)
      return new Response(JSON.stringify({
        status: 'already_completed',
        message: '이미 처리된 주문입니다.'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        status: 200,
      })
    }

    // 2. Toss Payments 결제 승인 API 호출
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(TOSS_SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId, // Toss에는 원본 orderId 전달 (ORDER-31-1760323026204)
        amount,
      }),
    })

    if (!tossResponse.ok) {
      const error = await tossResponse.json()
      console.error('Toss payment confirmation failed:', error)
      throw new Error(error.message || '결제 승인 실패')
    }

    const paymentData = await tossResponse.json()
    console.log('Toss payment confirmed:', paymentData)

    // 3. Supabase에 결제 정보 업데이트 (파싱된 orderIdNumber 사용)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        payment_key: paymentKey,
        payment_method: paymentData.method,
        payment_date: new Date().toISOString(),
      })
      .eq('id', orderIdNumber) // ✅ 수정: 파싱된 숫자 ID 사용

    if (updateError) {
      console.error('Order update failed:', updateError)
      throw updateError
    }

    console.log('Order updated successfully:', orderIdNumber)

    return new Response(JSON.stringify({
      status: 'success',
      ...paymentData
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    })
  } catch (error) {
    console.error('Payment confirmation error:', error)
    return new Response(JSON.stringify({
      error: error.message || '결제 처리 중 오류가 발생했습니다.'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 400,
    })
  }
})
