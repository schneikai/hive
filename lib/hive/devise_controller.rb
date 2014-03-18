# Extensions for Devise base controller.

module Hive
  module DeviseController
    extend ActiveSupport::Concern

    included do
      # Set the layout to use for Hive/Devise views.
      # This is configurable in the Hive initializer.
      layout :hive_layout
    end

    private
      # I wanted to have all views under the Hive namespace and not under Devise.
      # I do this be prepending a new template path to the *prefixes* option Rails
      # uses to find the template. So if a template is present in *hive/[controller_name]*
      # i.e: "hive/registrations" Rails will load the template from there instead of
      # "devise/registrations".
      def _process_options options
        options[:prefixes].unshift "hive/#{controller_name}"
        super options
      end

      def hive_layout
        if Hive.layout.is_a?(Hash)
          layout = Hive.layout.fetch(controller_name, {}).fetch(action_name, Hive.layout['default'])
        else
          layout = Hive.layout
        end
        layout
      end
  end
end
