import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../services/supabase'
import { Plus, Edit2, Trash2, Search, Package, ExternalLink, Upload, X } from 'lucide-react'

const Products = () => {
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    introduction: '',
    features: '',
    specifications: '',
    image_url: '',
    status: 'active'
  })

  // 디버깅: showModal 상태 변경 감지
  useEffect(() => {
    console.log('showModal state changed:', showModal)
  }, [showModal])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data || [])
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.')
        return
      }

      // 이미지 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        return
      }

      setImageFile(file)

      // 미리보기 생성
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = async () => {
    if (!imageFile) return null

    try {
      setUploading(true)

      // 파일명 생성 (타임스탬프 + 랜덤값)
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile)

      if (uploadError) throw uploadError

      // 공개 URL 생성
      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Image upload error:', error)
      alert('이미지 업로드 실패: ' + error.message)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    let imageUrl = formData.image_url

    // 새 이미지 파일이 있으면 업로드
    if (imageFile) {
      const uploadedUrl = await handleImageUpload()
      if (uploadedUrl) {
        imageUrl = uploadedUrl
      } else {
        alert('이미지 업로드에 실패했습니다.')
        return
      }
    }

    const submitData = {
      ...formData,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost),
      image_url: imageUrl
    }

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(submitData)
        .eq('id', editingProduct.id)

      if (error) {
        alert('상품 정보 수정 실패: ' + error.message)
      } else {
        alert('상품 정보가 수정되었습니다.')
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert([submitData])

      if (error) {
        alert('상품 등록 실패: ' + error.message)
      } else {
        alert('상품이 등록되었습니다.')
      }
    }

    resetForm()
    fetchProducts()
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      cost: product.cost.toString(),
      introduction: product.introduction || '',
      features: product.features || '',
      specifications: product.specifications || '',
      image_url: product.image_url || '',
      status: product.status
    })
    setImageFile(null)
    setImagePreview(product.image_url || null)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    // 1단계: 판매 내역 확인
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('id')
      .eq('product_id', id)

    if (salesError) {
      alert('판매 내역 확인 중 오류가 발생했습니다: ' + salesError.message)
      return
    }

    const salesCount = salesData?.length || 0

    // 2단계: 경고 메시지
    let warningMessage = '⚠️ 상품 삭제 경고\n\n'

    if (salesCount > 0) {
      warningMessage += `이 상품은 ${salesCount}건의 판매 내역이 연결되어 있습니다.\n\n`
      warningMessage += '삭제 시 다음 문제가 발생할 수 있습니다:\n'
      warningMessage += '• 판매 내역의 상품 정보가 표시되지 않을 수 있습니다\n'
      warningMessage += '• 수수료 계산에 영향을 줄 수 있습니다\n'
      warningMessage += '• 통계 데이터가 부정확해질 수 있습니다\n\n'
      warningMessage += '대신 "품절" 상태로 변경하는 것을 권장합니다.\n\n'
    } else {
      warningMessage += '이 상품을 완전히 삭제합니다.\n\n'
    }

    warningMessage += '정말로 삭제하시겠습니까?'

    if (!confirm(warningMessage)) return

    // 3단계: 최종 확인
    if (salesCount > 0) {
      const finalConfirm = confirm(
        `마지막 확인\n\n` +
        `${salesCount}건의 판매 내역이 있는 상품을 삭제하시겠습니까?\n\n` +
        `이 작업은 되돌릴 수 없습니다.`
      )
      if (!finalConfirm) return
    }

    // 4단계: 삭제 실행
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      alert('상품 삭제 실패: ' + error.message)
    } else {
      alert('상품이 삭제되었습니다.')
      fetchProducts()
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      cost: '',
      introduction: '',
      features: '',
      specifications: '',
      image_url: '',
      status: 'active'
    })
    setImageFile(null)
    setImagePreview(null)
    setEditingProduct(null)
    setShowModal(false)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const generateProductUrl = (productId) => {
    return `${window.location.origin}/product/${productId}`
  }

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url)
    alert('상품 URL이 클립보드에 복사되었습니다!')
  }

  return (
    <div>
      {/* 헤더 및 검색 */}
      <div className="bg-white p-5 rounded-xl shadow-card mb-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="상품명 또는 설명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <button
            onClick={() => {
              console.log('Button clicked, opening modal')
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
          >
            <Plus className="h-5 w-5" />
            신규 상품 등록
          </button>
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">등록된 상품이 없습니다.</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
              {/* 상품 이미지 */}
              <div className="h-48 bg-gray-100 flex items-center justify-center">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-16 w-16 text-gray-400" />
                )}
              </div>
              
              {/* 상품 정보 */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    product.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.status === 'active' ? '판매중' : '품절'}
                  </span>
                </div>
                
                {product.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                )}
                
                {product.introduction && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">상품 소개</h4>
                    <p className="text-xs text-gray-600 line-clamp-3">{product.introduction}</p>
                  </div>
                )}
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">판매가격</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(product.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">원가</span>
                    <span className="text-sm text-gray-600">{formatCurrency(product.cost)}</span>
                  </div>
                </div>

                {/* 상품 URL */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">상품 URL</span>
                    <button
                      onClick={() => copyToClipboard(generateProductUrl(product.id))}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      복사
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={generateProductUrl(product.id)}
                      readOnly
                      className="text-xs text-gray-600 bg-transparent border-none flex-1"
                    />
                    <a
                      href={generateProductUrl(product.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 className="h-4 w-4 inline mr-1" />
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 inline mr-1" />
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 등록/수정 모달 - Portal을 사용하여 body에 직접 렌더링 */}
      {showModal && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              console.log('Backdrop clicked, closing modal')
              resetForm()
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '28rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              zIndex: 10000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingProduct ? '상품 정보 수정' : '신규 상품 등록'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">상품명 *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">상품 설명</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">판매가격 *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">원가 *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">상품 소개 *</label>
                  <textarea
                    required
                    value={formData.introduction}
                    onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                    rows="4"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="상품의 특징과 장점을 자세히 설명해주세요..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">주요 기능</label>
                  <textarea
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="주요 기능이나 특징을 나열해주세요..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">제품 사양</label>
                  <textarea
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="제품의 기술적 사양이나 규격을 입력해주세요..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">상품 이미지</label>

                  {/* 이미지 미리보기 */}
                  {imagePreview && (
                    <div className="mt-2 relative">
                      <img
                        src={imagePreview}
                        alt="미리보기"
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview(null)
                          setFormData({ ...formData, image_url: '' })
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* 파일 업로드 */}
                  <div className="mt-2">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">클릭하여 업로드</span> 또는 드래그 & 드롭
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF (최대 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>
                {editingProduct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">상품 페이지 URL</label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={generateProductUrl(editingProduct.id)}
                        readOnly
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generateProductUrl(editingProduct.id))}
                        className="px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 whitespace-nowrap text-sm"
                      >
                        복사
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">고객에게 전송할 상품 구매 페이지 URL (자동 생성됨)</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">상태</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">판매중</option>
                    <option value="inactive">품절</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={uploading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {uploading ? '업로드 중...' : (editingProduct ? '수정' : '등록')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Products
