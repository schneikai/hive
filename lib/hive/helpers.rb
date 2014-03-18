module Hive
  module Helpers
    # Sets or gets the title for a hive view.
    #
    # To set the title in a view use
    #   <% hive_title 'Please Sign-In' %>
    #
    # To display this title in your layout use
    #   <title><%= hive_title %></title>
    #
    # If you use a custom way of setting titles in views and displaying them
    # in your layout you can just overwrite this method.
    def hive_title(title=nil)
      if title.nil?
        content_for?(:hive_title) ? content_for(:hive_title) : Hive.app_name
      else
        content_for :hive_title, "#{title} - #{Hive.app_name}"
      end
    end

    # Add the Hive animation class to a element in a view if animations
    # are enabled (default) in the Hive initializer.
    def hive_animation_class
      "hive-animated" if Hive.animate_views
    end
  end
end
