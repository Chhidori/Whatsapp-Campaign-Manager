import React from 'react';

const MessagesDemo = () => {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Left Sidebar - Contact List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Contact 1 - Active */}
          <div className="flex items-center p-4 border-b border-gray-100 cursor-pointer bg-blue-50 border-blue-200">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-3">
              <span className="text-gray-600 font-medium">J</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 truncate">John Doe</h3>
                <span className="text-xs text-gray-500">30m ago</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-gray-500 truncate">Thanks for the information!</p>
              </div>
            </div>
          </div>

          {/* Contact 2 - Has unread */}
          <div className="flex items-center p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-3">
              <span className="text-gray-600 font-medium">J</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 truncate">Jane Smith</h3>
                <span className="text-xs text-gray-500">10m ago</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-gray-500 truncate">Can you send me more details?</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  2
                </span>
              </div>
            </div>
          </div>

          {/* Contact 3 */}
          <div className="flex items-center p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-3">
              <span className="text-gray-600 font-medium">B</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 truncate">Bob Johnson</h3>
                <span className="text-xs text-gray-500">2h ago</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-gray-500 truncate">Thank you for your interest. Here are...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Message View */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
              <span className="text-gray-600 font-medium">J</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">John Doe</h2>
              <p className="text-sm text-gray-500">Lead ID: lead_001</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {/* Outgoing Message */}
          <div className="flex justify-end">
            <div className="max-w-xs lg:max-w-md xl:max-w-lg">
              <div className="p-3 rounded-lg bg-blue-500 text-white rounded-br-sm">
                <p className="text-sm">Hello! Thank you for your interest in our product.</p>
              </div>
              <div className="flex items-center mt-1 text-xs text-gray-500 justify-end">
                <span>2h ago</span>
                <span className="ml-1 text-blue-500">✓✓</span>
              </div>
            </div>
          </div>

          {/* Incoming Message */}
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md xl:max-w-lg">
              <div className="p-3 rounded-lg bg-white text-gray-900 rounded-bl-sm shadow-sm">
                <p className="text-sm">Hi! Yes, I would like to know more about the pricing.</p>
              </div>
              <div className="flex items-center mt-1 text-xs text-gray-500 justify-start">
                <span>90m ago</span>
              </div>
            </div>
          </div>

          {/* Incoming Message */}
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md xl:max-w-lg">
              <div className="p-3 rounded-lg bg-white text-gray-900 rounded-bl-sm shadow-sm">
                <p className="text-sm">Thanks for the information!</p>
              </div>
              <div className="flex items-center mt-1 text-xs text-gray-500 justify-start">
                <span>30m ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled
            />
            <button className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50" disabled>
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Message sending will be available in future updates</p>
        </div>
      </div>
    </div>
  );
};

export default MessagesDemo;