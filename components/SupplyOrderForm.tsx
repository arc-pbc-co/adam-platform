import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Package,
  Truck,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  FileText,
  Send,
  Plus,
  Minus,
  Building2,
  Clock,
  ShoppingCart,
  Printer,
} from 'lucide-react';

interface Material {
  id: string;
  name: string;
  composition: string;
  category: string;
  stockKg: number;
  costPerKg: number;
  properties: {
    density: number;
    meltingPoint: number;
    hardness?: number;
  };
}

interface OrderItem {
  material: Material;
  quantity: number;
  unit: 'kg' | 'lb';
}

interface SupplyOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  initialMaterial?: Material;
}

type OrderStatus = 'draft' | 'submitting' | 'submitted' | 'error';

export function SupplyOrderForm({ isOpen, onClose, materials, initialMaterial }: SupplyOrderFormProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    initialMaterial ? [{ material: initialMaterial, quantity: 50, unit: 'kg' }] : []
  );
  const [orderName, setOrderName] = useState(`Supply Order ${new Date().toLocaleDateString()}`);
  const [priority, setPriority] = useState<'standard' | 'expedited' | 'rush'>('standard');
  const [notes, setNotes] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('Bay A - Material Storage');
  const [poNumber, setPoNumber] = useState('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('draft');
  const [activeTab, setActiveTab] = useState<'order' | 'items'>('order');

  const priorityMultipliers = { standard: 1, expedited: 1.25, rush: 1.5 };
  const shippingCosts = { standard: 150, expedited: 350, rush: 750 };
  const leadTimes = { standard: '5-7 business days', expedited: '2-3 business days', rush: 'Next day' };

  const addItem = (material: Material) => {
    const existing = orderItems.find(item => item.material.id === material.id);
    if (existing) {
      setOrderItems(orderItems.map(item =>
        item.material.id === material.id
          ? { ...item, quantity: item.quantity + 25 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, { material, quantity: 25, unit: 'kg' }]);
    }
  };

  const updateQuantity = (materialId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter(item => item.material.id !== materialId));
    } else {
      setOrderItems(orderItems.map(item =>
        item.material.id === materialId ? { ...item, quantity } : item
      ));
    }
  };

  const removeItem = (materialId: string) => {
    setOrderItems(orderItems.filter(item => item.material.id !== materialId));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.material.costPerKg * item.quantity, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const priorityCharge = subtotal * (priorityMultipliers[priority] - 1);
    const shipping = shippingCosts[priority];
    return subtotal + priorityCharge + shipping;
  };

  const handleSubmit = async () => {
    if (orderItems.length === 0) return;

    setOrderStatus('submitting');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 90% success rate simulation
    if (Math.random() > 0.1) {
      setOrderStatus('submitted');
    } else {
      setOrderStatus('error');
    }
  };

  const resetOrder = () => {
    setOrderStatus('draft');
    setOrderItems([]);
    setOrderName(`Supply Order ${new Date().toLocaleDateString()}`);
    setPriority('standard');
    setNotes('');
    setPoNumber('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-[#1a1f2e] border border-[#2a3441] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#0d1117] border-b border-[#2a3441] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Material Supply Order</h2>
                  <p className="text-xs text-gray-500">Desktop Metal Powder Fulfillment</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {orderStatus === 'draft' && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded border border-yellow-500/30">
                    Draft
                  </span>
                )}
                {orderStatus === 'submitted' && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded border border-green-500/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Submitted
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[#2a3441] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-[#0d1117] border-b border-[#2a3441] px-6">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('order')}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === 'order'
                      ? 'text-cyan-400 border-cyan-400'
                      : 'text-gray-500 border-transparent hover:text-white'
                  }`}
                >
                  Order Details
                </button>
                <button
                  onClick={() => setActiveTab('items')}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                    activeTab === 'items'
                      ? 'text-cyan-400 border-cyan-400'
                      : 'text-gray-500 border-transparent hover:text-white'
                  }`}
                >
                  Add Materials
                  <span className="px-1.5 py-0.5 text-xs bg-[#2a3441] rounded">
                    {materials.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {orderStatus === 'submitted' ? (
                <div className="flex flex-col items-center justify-center py-16 px-8">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Order Submitted!</h3>
                  <p className="text-gray-400 text-center mb-6 max-w-md">
                    Your supply order has been sent to Desktop Metal for fulfillment.
                    You will receive a confirmation email shortly.
                  </p>
                  <div className="bg-[#0d1117] border border-[#2a3441] rounded-lg p-4 mb-6">
                    <div className="text-sm text-gray-400">Order Reference</div>
                    <div className="text-lg font-mono text-cyan-400">DM-{Date.now().toString(36).toUpperCase()}</div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={resetOrder}
                      className="px-6 py-2 bg-[#2a3441] hover:bg-[#3a4451] text-white rounded-lg transition-colors"
                    >
                      New Order
                    </button>
                    <button
                      onClick={onClose}
                      className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : orderStatus === 'error' ? (
                <div className="flex flex-col items-center justify-center py-16 px-8">
                  <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Submission Failed</h3>
                  <p className="text-gray-400 text-center mb-6 max-w-md">
                    There was an error submitting your order. Please try again or contact support.
                  </p>
                  <button
                    onClick={() => setOrderStatus('draft')}
                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  {activeTab === 'order' && (
                    <div className="grid grid-cols-2 gap-6">
                      {/* Left Column - Order Info */}
                      <div className="space-y-5">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">
                            Order Name
                          </label>
                          <input
                            type="text"
                            value={orderName}
                            onChange={(e) => setOrderName(e.target.value)}
                            className="w-full bg-[#0d1117] border border-[#2a3441] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">
                            PO Number (Optional)
                          </label>
                          <input
                            type="text"
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            placeholder="PO-2024-XXXX"
                            className="w-full bg-[#0d1117] border border-[#2a3441] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">
                            Delivery Priority
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['standard', 'expedited', 'rush'] as const).map(p => (
                              <button
                                key={p}
                                onClick={() => setPriority(p)}
                                className={`py-2.5 px-3 rounded-lg text-sm font-medium capitalize transition-colors flex flex-col items-center ${
                                  priority === p
                                    ? p === 'rush' ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                    : p === 'expedited' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                    : 'bg-[#0d1117] text-gray-400 border border-[#2a3441] hover:border-gray-500'
                                }`}
                              >
                                <span>{p}</span>
                                <span className="text-[10px] opacity-70">{leadTimes[p]}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">
                            Delivery Location
                          </label>
                          <select
                            value={deliveryLocation}
                            onChange={(e) => setDeliveryLocation(e.target.value)}
                            className="w-full bg-[#0d1117] border border-[#2a3441] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option>Bay A - Material Storage</option>
                            <option>Bay B - Print Floor</option>
                            <option>Bay C - R&D Lab</option>
                            <option>External Warehouse</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider">
                            Notes
                          </label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Special handling instructions, preferred delivery time..."
                            rows={3}
                            className="w-full bg-[#0d1117] border border-[#2a3441] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 resize-none"
                          />
                        </div>
                      </div>

                      {/* Right Column - Order Items & Summary */}
                      <div className="space-y-5">
                        {/* Order Items */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-gray-500 uppercase tracking-wider">
                              Order Items
                            </label>
                            <button
                              onClick={() => setActiveTab('items')}
                              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add Materials
                            </button>
                          </div>

                          {orderItems.length === 0 ? (
                            <div className="bg-[#0d1117] border border-[#2a3441] border-dashed rounded-lg p-6 text-center">
                              <Package className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No items added</p>
                              <button
                                onClick={() => setActiveTab('items')}
                                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                              >
                                Browse materials
                              </button>
                            </div>
                          ) : (
                            <div className="bg-[#0d1117] border border-[#2a3441] rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-[#2a3441] text-gray-500 text-xs uppercase">
                                    <th className="text-left py-2 px-3">Material</th>
                                    <th className="text-center py-2 px-3">Qty (kg)</th>
                                    <th className="text-right py-2 px-3">Price</th>
                                    <th className="w-8"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orderItems.map(item => (
                                    <tr key={item.material.id} className="border-b border-[#2a3441]/50">
                                      <td className="py-2 px-3">
                                        <div className="text-white text-xs">{item.material.name}</div>
                                        <div className="text-gray-600 text-[10px]">{item.material.composition}</div>
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            onClick={() => updateQuantity(item.material.id, item.quantity - 25)}
                                            className="p-1 hover:bg-[#2a3441] rounded"
                                          >
                                            <Minus className="w-3 h-3 text-gray-400" />
                                          </button>
                                          <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateQuantity(item.material.id, parseInt(e.target.value) || 0)}
                                            className="w-14 bg-transparent text-center text-white text-xs focus:outline-none"
                                          />
                                          <button
                                            onClick={() => updateQuantity(item.material.id, item.quantity + 25)}
                                            className="p-1 hover:bg-[#2a3441] rounded"
                                          >
                                            <Plus className="w-3 h-3 text-gray-400" />
                                          </button>
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-right text-cyan-400 text-xs">
                                        ${(item.material.costPerKg * item.quantity).toLocaleString()}
                                      </td>
                                      <td className="py-2 px-1">
                                        <button
                                          onClick={() => removeItem(item.material.id)}
                                          className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Order Summary */}
                        <div className="bg-[#0d1117] border border-[#2a3441] rounded-lg p-4">
                          <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Order Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-400">
                              <span>Subtotal</span>
                              <span className="text-white">${calculateSubtotal().toLocaleString()}</span>
                            </div>
                            {priority !== 'standard' && (
                              <div className="flex justify-between text-gray-400">
                                <span>{priority === 'rush' ? 'Rush' : 'Expedited'} Fee</span>
                                <span className="text-yellow-400">
                                  +${(calculateSubtotal() * (priorityMultipliers[priority] - 1)).toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-gray-400">
                              <span>Shipping</span>
                              <span className="text-white">${shippingCosts[priority]}</span>
                            </div>
                            <div className="border-t border-[#2a3441] pt-2 mt-2">
                              <div className="flex justify-between">
                                <span className="font-semibold text-white">Total</span>
                                <span className="text-xl font-bold text-cyan-400">
                                  ${calculateTotal().toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Estimated Delivery */}
                        <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                          <Truck className="w-5 h-5 text-cyan-400" />
                          <div>
                            <div className="text-xs text-gray-400">Estimated Delivery</div>
                            <div className="text-sm text-white font-medium">{leadTimes[priority]}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'items' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-400">
                        Select materials to add to your order. Click on a material to add 25kg.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                        {materials.map(material => {
                          const inOrder = orderItems.find(item => item.material.id === material.id);
                          return (
                            <div
                              key={material.id}
                              onClick={() => addItem(material)}
                              className={`bg-[#0d1117] border rounded-lg p-3 cursor-pointer transition-all hover:border-cyan-500/50 ${
                                inOrder ? 'border-cyan-500/50 ring-1 ring-cyan-500/20' : 'border-[#2a3441]'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="text-white text-sm font-medium">{material.name}</div>
                                  <div className="text-gray-600 text-xs">{material.composition}</div>
                                </div>
                                {inOrder && (
                                  <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] rounded">
                                    {inOrder.quantity}kg
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">{material.category}</span>
                                <span className="text-cyan-400 font-medium">${material.costPerKg}/kg</span>
                              </div>
                              <div className="mt-2 text-[10px] text-gray-600">
                                Stock: {material.stockKg}kg available
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {orderStatus === 'draft' && (
              <div className="bg-[#0d1117] border-t border-[#2a3441] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Building2 className="w-4 h-4" />
                  <span>Fulfillment by Desktop Metal</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={orderItems.length === 0 || orderStatus === 'submitting'}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center gap-2"
                  >
                    {orderStatus === 'submitting' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
